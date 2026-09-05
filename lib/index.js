import z from "@deepseek-ai/schemastery";
import { randomBytes, randomUUID } from "node:crypto";
//#region src/config.ts
/** Validated Cordis configuration for the IMA plugin. */
const Config = z.object({
	requestTimeoutMs: z.number().step(1).min(1).default(3e5),
	retryCount: z.number().step(1).min(0).max(10).default(3),
	concurrencyLimit: z.number().step(1).min(1).max(16).default(1),
	baseUrl: z.string().default("https://ima.qq.com")
});
/**
* Normalize configuration values that require cross-field checks.
* @param config - schema-validated Cordis configuration.
* @returns a copy safe for runtime use.
*/
function resolveConfig(config) {
	let baseUrl;
	try {
		const parsed = new URL(config.baseUrl);
		if (parsed.protocol !== "https:" && parsed.hostname !== "127.0.0.1" && parsed.hostname !== "localhost") throw new Error("non-HTTPS remote origin");
		baseUrl = parsed.origin;
	} catch (error) {
		throw new Error(`ima-copilot: invalid baseUrl: ${error instanceof Error ? error.message : String(error)}`);
	}
	return {
		...config,
		baseUrl
	};
}
//#endregion
//#region src/compat/host.ts
/** IMA-BASE-1 Host contract version. Diagnostic metadata only. */
const IMA_HOST_CONTRACT = "IMA-BASE-1";
const CREDENTIAL_REF_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/u;
const SETTINGS_NAMESPACE_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/u;
function validateCredentialReference(value) {
	if (!CREDENTIAL_REF_PATTERN.test(value)) throw new TypeError(`credential ref "${value}" must match ${String(CREDENTIAL_REF_PATTERN)}`);
	return value;
}
function validateSettingsNamespace(value) {
	if (!SETTINGS_NAMESPACE_PATTERN.test(value)) throw new TypeError(`settings namespace "${value}" must match ${String(SETTINGS_NAMESPACE_PATTERN)}`);
	return value;
}
/** Compile the plugin-owned tool spec at the sole native tools boundary. */
function defineCompatibleTool(spec) {
	if (spec.timeoutMs !== void 0 && (!Number.isFinite(spec.timeoutMs) || spec.timeoutMs <= 0)) throw new Error(`defineCompatibleTool(${spec.name}): timeoutMs must be a positive finite number`);
	const parameters = compileParameterSchema(spec.parameters);
	const outputSchema = compileValueSchema(spec.output.schema);
	return {
		name: spec.name,
		description: spec.description,
		parameters,
		output: {
			schema: outputSchema,
			render: (args, value) => spec.output.render(args, value)
		},
		...spec.timeoutMs === void 0 ? {} : { timeoutMs: spec.timeoutMs },
		async execute(args, exec) {
			const violations = validateParameters(parameters, args);
			if (violations.length > 0) throw new Error(`invalid arguments: ${violations.join("; ")}`);
			return spec.execute(args, exec);
		}
	};
}
function compileParameterSchema(properties) {
	const compiled = {};
	const required = [];
	for (const [name, value] of Object.entries(properties)) {
		const property = value;
		if (property.required === true) required.push(name);
		compiled[name] = compileValueSchema(property);
	}
	return {
		type: "object",
		properties: compiled,
		...required.length === 0 ? {} : { required }
	};
}
function compileValueSchema(value) {
	const compiled = {};
	for (const [key, entry] of Object.entries(value)) {
		if (key === "required") continue;
		if (key === "properties" && typeof entry === "object" && entry !== null) {
			const properties = {};
			const required = [];
			for (const [name, childValue] of Object.entries(entry)) {
				const child = childValue;
				if (child.required === true) required.push(name);
				properties[name] = compileValueSchema(child);
			}
			compiled.properties = properties;
			if (required.length > 0) compiled.required = required;
		} else if (key === "items" && typeof entry === "object" && entry !== null) compiled.items = compileValueSchema(entry);
		else compiled[key] = entry;
	}
	return compiled;
}
function validateParameters(schema, value) {
	if (typeof value !== "object" || value === null || Array.isArray(value)) return ["arguments must be an object"];
	const candidate = value;
	const properties = schema.properties;
	const violations = [];
	for (const name of schema.required ?? []) if (!(name in candidate)) violations.push(`${name}: required`);
	for (const [name, entry] of Object.entries(candidate)) if (properties[name]?.type === "string" && typeof entry !== "string") violations.push(`${name}: expected string`);
	return violations;
}
/** Build the shared structural Host adapter accepted by every audited interface family. */
function createHostContract(context) {
	const ctx = context;
	return {
		contract: IMA_HOST_CONTRACT,
		resolveCredential: (ref) => ctx.credentials.resolve(validateCredentialReference(ref)),
		registerTool: (tool) => ctx.tools.register(tool),
		effect(callback, label) {
			ctx.effect(callback, label);
		},
		withSettings(namespace, schema, options, install) {
			const validatedNamespace = validateSettingsNamespace(namespace);
			ctx.inject(["settings"], (settingsContext) => {
				install(settingsContext.settings.register(validatedNamespace, schema, options), createHostContract(settingsContext));
			});
		}
	};
}
//#endregion
//#region src/credential-values.ts
/** Remove harmless copy artifacts and validate a value used as an IMA HTTP header. */
function normalizeImaHeaderCredential(value, label) {
	const normalized = value.replace(/\uFEFF/gu, "").trim();
	if (normalized.length === 0) throw new Error(`ima_ask: ${label} is empty after removing formatting characters`);
	let index = 0;
	for (const character of normalized) {
		const codePoint = character.codePointAt(0);
		if (codePoint > 255 || codePoint < 32 || codePoint === 127) {
			const code = `U+${codePoint.toString(16).toUpperCase().padStart(4, "0")}`;
			throw new Error(`ima_ask: ${label} contains unsupported HTTP header character ${code} at index ${index}; ${codePoint === 8230 ? "the value appears truncated; copy the complete value again as plain text" : "copy the complete value again as plain text"}`);
		}
		index += character.length;
	}
	return normalized;
}
//#endregion
//#region src/semaphore.ts
/** Abort-aware FIFO limit around complete IMA question operations. */
var Semaphore = class {
	limit;
	active = 0;
	queued = [];
	/** @param limit - maximum simultaneous holders. */
	constructor(limit) {
		this.limit = limit;
	}
	/**
	* Wait for a permit.
	* @param signal - cancellation while queued.
	* @returns a one-shot release callback.
	*/
	acquire(signal) {
		if (signal.aborted) return Promise.reject(signal.reason);
		if (this.active < this.limit) {
			this.active += 1;
			return Promise.resolve(this.releaseOnce());
		}
		return new Promise((resolve, reject) => {
			const waiter = {
				signal,
				resolve,
				reject,
				onAbort: () => {
					const index = this.queued.indexOf(waiter);
					if (index >= 0) this.queued.splice(index, 1);
					reject(signal.reason);
				}
			};
			signal.addEventListener("abort", waiter.onAbort, { once: true });
			this.queued.push(waiter);
		});
	}
	releaseOnce() {
		let released = false;
		return () => {
			if (released) return;
			released = true;
			while (this.queued.length > 0) {
				const waiter = this.queued.shift();
				if (waiter === void 0 || waiter.signal.aborted) continue;
				waiter.signal.removeEventListener("abort", waiter.onAbort);
				waiter.resolve(this.releaseOnce());
				return;
			}
			this.active -= 1;
		};
	}
};
//#endregion
//#region src/ima-client.ts
const REFRESH_PATH = "/cgi-bin/auth_login/refresh";
const INIT_SESSION_PATH = "/cgi-bin/session_logic/init_session";
const QUESTION_PATH = "/cgi-bin/assistant/qa";
/** IMA failure with an explicit retry classification. */
var ImaError = class extends Error {
	retryable;
	authentication;
	/** @param message - safe diagnostic without secret response content. */
	constructor(message, retryable = false, authentication = false) {
		super(message);
		this.retryable = retryable;
		this.authentication = authentication;
		this.name = "ImaError";
	}
};
/** IMA Web client owned by the Harness Host plugin. */
var ImaClient = class {
	config;
	fetchImpl;
	semaphore;
	/**
	* @param config - resolved deployment configuration.
	* @param fetchImpl - fetch implementation; overridden only by isolated tests.
	*/
	constructor(config, fetchImpl = fetch) {
		this.config = config;
		this.fetchImpl = fetchImpl;
		this.semaphore = new Semaphore(config.concurrencyLimit);
	}
	/**
	* Execute one isolated knowledge-base question.
	* @param question - non-empty user question.
	* @param knowledgeBaseId - selected configured knowledge base.
	* @param credentials - secrets resolved for this operation.
	* @param outerSignal - Harness execution cancellation.
	* @returns canonical answer and references.
	*/
	async ask(question, knowledgeBaseId, credentials, outerSignal) {
		const normalizedCredentials = normalizeCredentials(credentials);
		const signal = AbortSignal.any([outerSignal, AbortSignal.timeout(this.config.requestTimeoutMs)]);
		const release = await this.semaphore.acquire(signal);
		try {
			const auth = await this.refresh(normalizedCredentials, signal);
			let lastError;
			for (let attempt = 0; attempt <= this.config.retryCount; attempt += 1) try {
				const sessionId = await this.initSession(knowledgeBaseId, auth, signal);
				const parsed = await this.askSession(question, sessionId, auth, signal);
				if (parsed.answer.trim().length === 0 && parsed.codes.length === 1 && parsed.codes[0] === 3) throw new ImaError("IMA returned Code 3 without answer text", true);
				if (parsed.answer.trim().length === 0) throw new ImaError("IMA returned no answer text");
				return {
					answer: cleanAnswer(parsed.answer),
					references: parsed.references
				};
			} catch (error) {
				lastError = error;
				if (signal.aborted) throw signal.reason;
				if (!(error instanceof ImaError) || !error.retryable || attempt === this.config.retryCount) throw error;
				await abortableDelay(Math.min(1e3 * 2 ** attempt, 1e4), signal);
			}
			throw lastError;
		} finally {
			release();
		}
	}
	async refresh(credentials, signal) {
		const userId = cookieValue(credentials.xImaCookie, "IMA-UID");
		const refreshToken = cookieValue(credentials.xImaCookie, "IMA-REFRESH-TOKEN") ?? cookieValue(credentials.xImaCookie, "IMA-TOKEN");
		if (userId === void 0 || refreshToken === void 0) throw new ImaError("IMA authentication is missing IMA-UID or IMA-REFRESH-TOKEN");
		const payload = await readJsonRecord(await this.request(REFRESH_PATH, {
			signal,
			headers: this.headers(credentials, "json"),
			body: JSON.stringify({
				user_id: userId,
				refresh_token: refreshToken,
				token_type: 14
			})
		}), "token refresh");
		const code = numberField(payload, "code");
		const token = stringField(payload, "token");
		if (code !== 0 || token === void 0 || token.length === 0) throw new ImaError(structuredFailure("IMA token refresh failed", code, payload), false, true);
		return {
			...credentials,
			token,
			clientId: randomUUID(),
			xImaCookie: replaceCookieValue(credentials.xImaCookie, "IMA-TOKEN", token)
		};
	}
	async initSession(knowledgeBaseId, auth, signal) {
		const payload = await readJsonRecord(await this.request(INIT_SESSION_PATH, {
			signal,
			headers: this.headers(auth, "json", auth.token),
			body: JSON.stringify({
				envInfo: {
					robotType: 5,
					interactType: 0
				},
				relatedUrl: knowledgeBaseId,
				sceneType: 1,
				msgsLimit: 10,
				forbidAutoAddToHistoryList: false,
				knowledgeBaseInfoWithFolder: {
					knowledgeBaseId,
					folderIds: []
				}
			})
		}), "session initialization");
		const code = numberField(payload, "code");
		const sessionId = stringField(payload, "session_id");
		if (code !== 0 || sessionId === void 0 || sessionId.length === 0) {
			const authentication = isAuthenticationCode(code);
			throw new ImaError(`${structuredFailure("IMA session initialization failed", code, payload)}${authentication ? "; update X-Ima-Cookie and X-Ima-Bkn together from the same signed-in browser session" : ""}`, isTransientCode(code), authentication);
		}
		return sessionId;
	}
	async askSession(question, sessionId, auth, signal) {
		const guid = cookieValue(auth.xImaCookie, "IMA-GUID") ?? "default_guid";
		const response = await this.request(QUESTION_PATH, {
			signal,
			headers: this.headers(auth, "sse", auth.token),
			body: JSON.stringify({
				session_id: sessionId,
				robot_type: 5,
				question,
				question_type: 2,
				client_id: auth.clientId,
				command_info: {
					type: 14,
					knowledge_qa_info: {
						tags: [],
						knowledge_ids: [],
						media_id_infos: []
					}
				},
				model_info: {
					model_type: 4,
					enable_enhancement: false
				},
				history_info: {},
				device_info: {
					uskey: randomBytes(32).toString("base64"),
					uskey_bus_infos_input: `${guid}_${Math.floor(Date.now() / 1e3)}`
				},
				client_tools: []
			})
		});
		if (!(response.headers.get("content-type") ?? "").includes("text/event-stream")) {
			const payload = await readJsonRecord(response, "question");
			const code = numberField(payload, "code");
			throw new ImaError(structuredFailure("IMA question failed", code, payload), isTransientCode(code), isAuthenticationCode(code));
		}
		return parseSse(response, signal);
	}
	async request(path, init) {
		let response;
		try {
			response = await this.fetchImpl(`${this.config.baseUrl}${path}`, {
				...init,
				method: "POST"
			});
		} catch (error) {
			if (init.signal.aborted) throw init.signal.reason;
			throw new ImaError(`IMA network request failed: ${safeErrorMessage(error)}`, true);
		}
		if (!response.ok) throw new ImaError(`IMA HTTP request failed (${response.status})`, response.status === 408 || response.status === 429 || response.status >= 500, response.status === 401 || response.status === 403);
		return response;
	}
	headers(credentials, mode, token) {
		const headers = new Headers({
			accept: mode === "json" ? "application/json" : "*/*",
			"accept-language": "zh-CN,zh;q=0.9",
			"content-type": mode === "json" ? "application/json" : "text/event-stream",
			extension_version: "999.999.999",
			from_browser_ima: "1",
			priority: "u=1, i",
			referer: "https://ima.qq.com/wikis",
			"sec-ch-ua": "\"Not(A:Brand\";v=\"8\", \"Chromium\";v=\"144\", \"Microsoft Edge\";v=\"144\"",
			"sec-ch-ua-mobile": "?0",
			"sec-ch-ua-platform": "\"Windows\"",
			"sec-fetch-dest": "empty",
			"sec-fetch-mode": "cors",
			"sec-fetch-site": "same-origin",
			traceparent: traceparent(),
			"user-agent": userAgent(credentials.xImaCookie),
			"x-ima-bkn": credentials.xImaBkn,
			"x-ima-cookie": credentials.xImaCookie
		});
		if (mode === "sse") headers.set("cache-control", "no-cache");
		if (token !== void 0) headers.set("authorization", `Bearer ${token}`);
		return headers;
	}
};
function normalizeCredentials(credentials) {
	return {
		xImaCookie: normalizeImaHeaderCredential(credentials.xImaCookie, "X-Ima-Cookie"),
		xImaBkn: normalizeImaHeaderCredential(credentials.xImaBkn, "X-Ima-Bkn")
	};
}
async function parseSse(response, signal) {
	if (response.body === null) throw new ImaError("IMA SSE response has no body", true);
	const reader = response.body.getReader();
	const decoder = new TextDecoder();
	let buffer = "";
	const parsed = {
		answer: "",
		references: [],
		codes: []
	};
	try {
		while (true) {
			if (signal.aborted) throw signal.reason;
			const { done, value } = await reader.read();
			buffer += decoder.decode(value, { stream: !done });
			const lines = buffer.split(/\r?\n/);
			buffer = lines.pop() ?? "";
			for (const line of lines) consumeSseLine(line, parsed);
			if (done) break;
		}
		if (buffer.length > 0) consumeSseLine(buffer, parsed);
	} finally {
		reader.releaseLock();
	}
	parsed.references = deduplicateReferences(parsed.references);
	parsed.codes = [...new Set(parsed.codes)];
	return parsed;
}
function consumeSseLine(line, parsed) {
	const trimmed = line.trim();
	if (trimmed.length === 0 || trimmed.startsWith("event:") || trimmed.startsWith("id:")) return;
	const data = trimmed.startsWith("data:") ? trimmed.slice(5).trimStart() : trimmed;
	if (data.length === 0 || data === "[DONE]") return;
	let payload;
	try {
		payload = JSON.parse(data);
	} catch {
		return;
	}
	consumePayload(payload, parsed);
}
function consumePayload(payload, parsed) {
	if (!isRecord(payload)) return;
	const directCode = numberField(payload, "code") ?? numberField(payload, "Code");
	if (directCode !== void 0) parsed.codes.push(directCode);
	const blockType = stringField(payload, "Type");
	const blockData = payload.Data;
	if (blockType === "blockMessage" && isRecord(blockData)) {
		const textMessage = blockData.text_message;
		if (isRecord(textMessage)) {
			const text = stringField(textMessage, "Text");
			if (text !== void 0 && text.length > 0) appendAnswer(parsed, text);
		}
	}
	const medias = Array.isArray(payload.medias) ? payload.medias : [];
	for (const media of medias) {
		const reference = referenceOf(media);
		if (reference !== void 0) parsed.references.push(reference);
	}
	if (Array.isArray(payload.msgs)) for (const message of payload.msgs) consumeMessage(message, parsed);
	for (const candidate of [
		payload.content,
		payload.Text,
		payload.answer
	]) if (typeof candidate === "string" && candidate.length > 0) appendAnswer(parsed, candidate);
}
function consumeMessage(message, parsed) {
	if (!isRecord(message)) return;
	const content = message.content;
	if (typeof content === "string") {
		appendAnswer(parsed, content);
		return;
	}
	if (!isRecord(content)) return;
	const answer = stringField(content, "answer");
	if (answer !== void 0) try {
		const decoded = JSON.parse(answer);
		if (isRecord(decoded) && typeof decoded.Text === "string") appendAnswer(parsed, decoded.Text);
		else appendAnswer(parsed, answer);
	} catch {
		appendAnswer(parsed, answer);
	}
	const contextRefs = stringField(content, "context_refs");
	if (contextRefs === void 0) return;
	try {
		const decoded = JSON.parse(contextRefs);
		if (!isRecord(decoded) || !Array.isArray(decoded.medias)) return;
		for (const media of decoded.medias) {
			const reference = referenceOf(media);
			if (reference !== void 0) parsed.references.push(reference);
		}
	} catch {
		return;
	}
}
function appendAnswer(parsed, text) {
	if (text.startsWith(parsed.answer)) parsed.answer = text;
	else if (!parsed.answer.endsWith(text)) parsed.answer += text;
}
function referenceOf(value) {
	if (!isRecord(value)) return void 0;
	const id = stringField(value, "id");
	const title = stringField(value, "title");
	if (id === void 0 || title === void 0) return void 0;
	const reference = {
		id,
		title
	};
	const subtitle = stringField(value, "subtitle");
	const introduction = stringField(value, "introduction");
	const timestamp = numberField(value, "timestamp");
	if (subtitle !== void 0) reference.subtitle = subtitle;
	if (introduction !== void 0) reference.introduction = introduction;
	if (timestamp !== void 0) reference.timestamp = timestamp;
	const kb = value.knowledge_base_info;
	if (isRecord(kb) && typeof kb.name === "string") reference.knowledgeBase = kb.name;
	return reference;
}
function deduplicateReferences(references) {
	const seen = /* @__PURE__ */ new Set();
	return references.filter((reference) => {
		if (seen.has(reference.id)) return false;
		seen.add(reference.id);
		return true;
	});
}
async function readJsonRecord(response, operation) {
	let value;
	try {
		value = await response.json();
	} catch {
		throw new ImaError(`IMA ${operation} returned invalid JSON`);
	}
	if (!isRecord(value)) throw new ImaError(`IMA ${operation} returned a non-object response`);
	return value;
}
function cookieValue(cookie, name) {
	const entry = cookie.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
	if (entry === void 0) return void 0;
	const raw = entry.slice(name.length + 1);
	try {
		return decodeURIComponent(raw);
	} catch {
		return raw;
	}
}
function replaceCookieValue(cookie, name, value) {
	const parts = cookie.split(";").map((part) => part.trim()).filter(Boolean);
	const index = parts.findIndex((part) => part.startsWith(`${name}=`));
	if (index >= 0) parts[index] = `${name}=${value}`;
	else parts.push(`${name}=${value}`);
	return parts.join("; ");
}
function userAgent(cookie) {
	return cookieValue(cookie, "IMA-IUA") ?? "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/144.0.0.0 Safari/537.36";
}
function traceparent() {
	return `00-${randomBytes(16).toString("hex")}-${randomBytes(8).toString("hex")}-01`;
}
function isRecord(value) {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
function stringField(value, key) {
	return typeof value[key] === "string" ? value[key] : void 0;
}
function numberField(value, key) {
	return typeof value[key] === "number" && Number.isFinite(value[key]) ? value[key] : void 0;
}
function structuredFailure(prefix, code, payload) {
	const message = safeServerMessage(stringField(payload, "msg"));
	return `${prefix} (code ${code ?? "unknown"})${message === void 0 ? "" : `: ${message}`}`;
}
function safeServerMessage(message) {
	if (message === void 0) return void 0;
	const cleaned = message.replace(/[\u0000-\u001f\u007f]+/gu, " ").replace(/\b(token|cookie|authorization)\s*[:=]\s*\S+/giu, "$1=[redacted]").replace(/\s+/gu, " ").trim().slice(0, 200);
	return cleaned.length === 0 ? void 0 : cleaned;
}
function isAuthenticationCode(code) {
	return code === 41 || code === 110031 || code === 600001 || code === 600002 || code === 600003;
}
function isTransientCode(code) {
	return code === 3;
}
function cleanAnswer(answer) {
	return answer.split(/\r?\n/).map((line) => line.trim()).join("\n").replace(/\n{3,}/g, "\n\n").trim();
}
function safeErrorMessage(error) {
	return error instanceof Error ? error.message : String(error);
}
function abortableDelay(milliseconds, signal) {
	if (signal.aborted) return Promise.reject(signal.reason);
	return new Promise((resolve, reject) => {
		const timer = setTimeout(() => {
			signal.removeEventListener("abort", onAbort);
			resolve();
		}, milliseconds);
		const onAbort = () => {
			clearTimeout(timer);
			reject(signal.reason);
		};
		signal.addEventListener("abort", onAbort, { once: true });
	});
}
//#endregion
//#region src/credential-refs.ts
/** Credential reference containing the complete X-Ima-Cookie header. */
const IMA_X_IMA_COOKIE_REF = "IMA_X_IMA_COOKIE";
/** Credential reference containing the X-Ima-Bkn header. */
const IMA_X_IMA_BKN_REF = "IMA_X_IMA_BKN";
/** Runtime reference containing newline- or comma-separated IMA knowledge-base IDs. */
const IMA_KNOWLEDGE_BASE_IDS_REF = "IMA_KNOWLEDGE_BASE_IDS";
/** Secret authentication references. */
const IMA_CREDENTIAL_REFS = [IMA_X_IMA_COOKIE_REF, IMA_X_IMA_BKN_REF];
/** All dynamic values managed by both the Host tool and Web settings card. */
const IMA_RUNTIME_REFS = [...IMA_CREDENTIAL_REFS, IMA_KNOWLEDGE_BASE_IDS_REF];
//#endregion
//#region src/tool.ts
/** Stable model-visible tool name used by Harness and Designer discovery. */
const IMA_TOOL_NAME = "ima_ask";
/**
* Build the native IMA tool around the supplied runtime client.
* @param ctx - Harness context owning credential resolution.
* @param config - resolved static plugin configuration.
* @param client - IMA transport client.
* @returns registry-ready native tool definition.
*/
function createImaTool(host, config, client) {
	return defineCompatibleTool({
		name: IMA_TOOL_NAME,
		description: "Ask Tencent IMA Copilot a question using one configured knowledge base.",
		parameters: {
			question: {
				type: "string",
				required: true,
				description: "The non-empty question to answer from IMA."
			},
			knowledgeBaseId: {
				type: "string",
				description: "Configured knowledge-base ID. Required when more than one is available."
			}
		},
		output: {
			schema: {
				type: "object",
				additionalProperties: false,
				properties: {
					answer: {
						type: "string",
						required: true
					},
					references: {
						type: "array",
						required: true,
						items: {
							type: "object",
							additionalProperties: false,
							properties: {
								id: {
									type: "string",
									required: true
								},
								title: {
									type: "string",
									required: true
								},
								subtitle: { type: "string" },
								introduction: { type: "string" },
								timestamp: { type: "number" },
								knowledgeBase: { type: "string" }
							}
						}
					}
				}
			},
			render: (_args, value) => [{
				type: "text",
				text: renderAnswer(value.answer, value.references)
			}]
		},
		timeoutMs: config.requestTimeoutMs,
		async execute(args, exec) {
			const question = args.question.trim();
			if (question.length === 0) throw new Error("ima_ask: question must be non-empty");
			const runtime = await resolveRuntimeState(host);
			const knowledgeBaseId = selectKnowledgeBase(runtime.knowledgeBaseIds, args.knowledgeBaseId);
			return client.ask(question, knowledgeBaseId, runtime.credentials, exec.signal);
		}
	});
}
/**
* Resolve and validate all dynamic IMA state without retaining it in plugin state.
* @param ctx - Harness credential provider context.
* @returns operation-local authentication and knowledge-base allowlist.
*/
async function resolveRuntimeState(host) {
	const [cookie, bkn, knowledgeBaseIdsValue] = await Promise.all([
		host.resolveCredential(IMA_X_IMA_COOKIE_REF),
		host.resolveCredential(IMA_X_IMA_BKN_REF),
		host.resolveCredential(IMA_KNOWLEDGE_BASE_IDS_REF)
	]);
	const resolved = [
		cookie,
		bkn,
		knowledgeBaseIdsValue
	];
	const missing = IMA_RUNTIME_REFS.filter((_, index) => resolved[index]?.value.trim().length === 0 || resolved[index] === void 0);
	if (missing.length > 0) throw new Error(`ima_ask: configuration check failed; configure ${missing.join(", ")} in Settings > Plugins > Configurable > IMA Copilot`);
	const knowledgeBaseIds = parseKnowledgeBaseIds(knowledgeBaseIdsValue.value);
	if (knowledgeBaseIds.length === 0) throw new Error(`ima_ask: configuration check failed; ${IMA_KNOWLEDGE_BASE_IDS_REF} must contain at least one knowledge-base ID`);
	return {
		credentials: {
			xImaCookie: cookie.value,
			xImaBkn: bkn.value
		},
		knowledgeBaseIds
	};
}
/** Parse the write-only settings value into a stable unique allowlist. */
function parseKnowledgeBaseIds(value) {
	return [...new Set(value.split(/[\r\n,]+/u).map((id) => id.trim()).filter(Boolean))];
}
/**
* Select an allowed knowledge base from tool input and deployment state.
* @param configured - allowlisted IDs.
* @param requested - optional tool selector.
* @returns selected ID.
*/
function selectKnowledgeBase(configured, requested) {
	const selected = requested?.trim();
	if (selected !== void 0 && selected.length > 0) {
		if (!configured.includes(selected)) throw new Error("ima_ask: knowledgeBaseId is not configured");
		return selected;
	}
	if (configured.length === 1) return configured[0];
	throw new Error("ima_ask: knowledgeBaseId is required when multiple knowledge bases are configured");
}
function renderAnswer(answer, references) {
	if (references.length === 0) return answer;
	return `${answer}\n\nReferences:\n${references.map((reference, index) => {
		const source = reference.knowledgeBase === void 0 ? "" : ` — ${reference.knowledgeBase}`;
		return `${index + 1}. ${reference.title}${source} (${reference.id})`;
	}).join("\n")}`;
}
//#endregion
//#region src/index.ts
/** Native DeepSeek Harness Host plugin for Tencent IMA Copilot. */
/** Cordis plugin name used by Harness loader diagnostics. */
const name = "dsh-ima-copilot";
/** Harness services required by the Host entry. */
const inject = ["tools", "credentials"];
/** Settings namespace paired with the Web configuration card. */
const IMA_SETTINGS_NAMESPACE = "ima-copilot";
/**
* Register the native IMA tool for this plugin fiber.
* @param ctx - Harness Host context.
* @param config - validated bundle configuration.
*/
function apply(context, config) {
	const host = createHostContract(context);
	let settingsScope;
	const source = () => settingsScope?.get() ?? config;
	let disposeTool = () => {};
	const registerTool = () => {
		disposeTool();
		const resolved = resolveConfig(source());
		disposeTool = host.registerTool(createImaTool(host, resolved, new ImaClient(resolved)));
	};
	host.effect(() => {
		registerTool();
		return () => {
			disposeTool();
		};
	}, "ima-copilot: native tool registration");
	host.withSettings(IMA_SETTINGS_NAMESPACE, Config, {
		base: config,
		validate: (value) => {
			resolveConfig(value);
		}
	}, (scope, settingsHost) => {
		settingsScope = scope;
		registerTool();
		const unwatch = scope.watch(() => {
			registerTool();
		});
		settingsHost.effect(() => () => {
			unwatch();
			if (settingsScope === scope) settingsScope = void 0;
		}, "ima-copilot: settings section");
	});
}
//#endregion
export { Config, IMA_CREDENTIAL_REFS, IMA_KNOWLEDGE_BASE_IDS_REF, IMA_RUNTIME_REFS, IMA_SETTINGS_NAMESPACE, IMA_TOOL_NAME, IMA_X_IMA_BKN_REF, IMA_X_IMA_COOKIE_REF, ImaClient, ImaError, apply, createImaTool, inject, name, parseKnowledgeBaseIds, resolveConfig, resolveRuntimeState, selectKnowledgeBase };

//# sourceMappingURL=index.js.map