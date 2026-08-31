import { randomBytes, randomUUID } from 'node:crypto'
import type { ResolvedConfig } from './config.js'
import { normalizeImaHeaderCredential } from './credential-values.js'
import { Semaphore } from './semaphore.js'
import type { ImaAnswer, ImaCredentials, ImaReference } from './types.js'

const REFRESH_PATH = '/cgi-bin/auth_login/refresh'
const INIT_SESSION_PATH = '/cgi-bin/session_logic/init_session'
const QUESTION_PATH = '/cgi-bin/assistant/qa'

/** IMA failure with an explicit retry classification. */
export class ImaError extends Error {
  /** @param message - safe diagnostic without secret response content. */
  constructor(message: string, readonly retryable = false, readonly authentication = false) {
    super(message)
    this.name = 'ImaError'
  }
}

interface OperationAuth extends ImaCredentials {
  token: string
  clientId: string
}

interface ParsedSse {
  answer: string
  references: ImaReference[]
  codes: number[]
}

/** IMA Web client owned by the Harness Host plugin. */
export class ImaClient {
  private readonly semaphore: Semaphore

  /**
   * @param config - resolved deployment configuration.
   * @param fetchImpl - fetch implementation; overridden only by isolated tests.
   */
  constructor(
    private readonly config: ResolvedConfig,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {
    this.semaphore = new Semaphore(config.concurrencyLimit)
  }

  /**
   * Execute one isolated knowledge-base question.
   * @param question - non-empty user question.
   * @param knowledgeBaseId - selected configured knowledge base.
   * @param credentials - secrets resolved for this operation.
   * @param outerSignal - Harness execution cancellation.
   * @returns canonical answer and references.
   */
  async ask(
    question: string,
    knowledgeBaseId: string,
    credentials: ImaCredentials,
    outerSignal: AbortSignal,
  ): Promise<ImaAnswer> {
    const normalizedCredentials = normalizeCredentials(credentials)
    const signal = AbortSignal.any([outerSignal, AbortSignal.timeout(this.config.requestTimeoutMs)])
    const release = await this.semaphore.acquire(signal)
    try {
      const auth = await this.refresh(normalizedCredentials, signal)
      let lastError: unknown
      for (let attempt = 0; attempt <= this.config.retryCount; attempt += 1) {
        try {
          const sessionId = await this.initSession(knowledgeBaseId, auth, signal)
          const parsed = await this.askSession(question, sessionId, auth, signal)
          if (parsed.answer.trim().length === 0 && parsed.codes.length === 1 && parsed.codes[0] === 3) {
            throw new ImaError('IMA returned Code 3 without answer text', true)
          }
          if (parsed.answer.trim().length === 0) throw new ImaError('IMA returned no answer text')
          return { answer: cleanAnswer(parsed.answer), references: parsed.references }
        } catch (error) {
          lastError = error
          if (signal.aborted) throw signal.reason
          if (!(error instanceof ImaError) || !error.retryable || attempt === this.config.retryCount) throw error
          await abortableDelay(Math.min(1_000 * 2 ** attempt, 10_000), signal)
        }
      }
      throw lastError
    } finally {
      release()
    }
  }

  private async refresh(credentials: ImaCredentials, signal: AbortSignal): Promise<OperationAuth> {
    const userId = cookieValue(credentials.xImaCookie, 'IMA-UID')
    const refreshToken = cookieValue(credentials.xImaCookie, 'IMA-REFRESH-TOKEN')
      ?? cookieValue(credentials.xImaCookie, 'IMA-TOKEN')
    if (userId === undefined || refreshToken === undefined) {
      throw new ImaError('IMA authentication is missing IMA-UID or IMA-REFRESH-TOKEN')
    }
    const response = await this.request(REFRESH_PATH, {
      signal,
      headers: this.headers(credentials, 'json'),
      body: JSON.stringify({ user_id: userId, refresh_token: refreshToken, token_type: 14 }),
    })
    const payload = await readJsonRecord(response, 'token refresh')
    const code = numberField(payload, 'code')
    const token = stringField(payload, 'token')
    if (code !== 0 || token === undefined || token.length === 0) {
      throw new ImaError(structuredFailure('IMA token refresh failed', code, payload), false, true)
    }
    return {
      ...credentials,
      token,
      clientId: randomUUID(),
      xImaCookie: replaceCookieValue(credentials.xImaCookie, 'IMA-TOKEN', token),
    }
  }

  private async initSession(
    knowledgeBaseId: string,
    auth: OperationAuth,
    signal: AbortSignal,
  ): Promise<string> {
    const response = await this.request(INIT_SESSION_PATH, {
      signal,
      headers: this.headers(auth, 'json', auth.token),
      body: JSON.stringify({
        envInfo: { robotType: 5, interactType: 0 },
        relatedUrl: knowledgeBaseId,
        sceneType: 1,
        msgsLimit: 10,
        forbidAutoAddToHistoryList: false,
        knowledgeBaseInfoWithFolder: { knowledgeBaseId, folderIds: [] },
      }),
    })
    const payload = await readJsonRecord(response, 'session initialization')
    const code = numberField(payload, 'code')
    const sessionId = stringField(payload, 'session_id')
    if (code !== 0 || sessionId === undefined || sessionId.length === 0) {
      const authentication = isAuthenticationCode(code)
      throw new ImaError(
        `${structuredFailure('IMA session initialization failed', code, payload)}${authentication
          ? '; update X-Ima-Cookie and X-Ima-Bkn together from the same signed-in browser session'
          : ''}`,
        isTransientCode(code),
        authentication,
      )
    }
    return sessionId
  }

  private async askSession(
    question: string,
    sessionId: string,
    auth: OperationAuth,
    signal: AbortSignal,
  ): Promise<ParsedSse> {
    const guid = cookieValue(auth.xImaCookie, 'IMA-GUID') ?? 'default_guid'
    const response = await this.request(QUESTION_PATH, {
      signal,
      headers: this.headers(auth, 'sse', auth.token),
      body: JSON.stringify({
        session_id: sessionId,
        robot_type: 5,
        question,
        question_type: 2,
        client_id: auth.clientId,
        command_info: {
          type: 14,
          knowledge_qa_info: { tags: [], knowledge_ids: [], media_id_infos: [] },
        },
        model_info: { model_type: 4, enable_enhancement: false },
        history_info: {},
        device_info: {
          uskey: randomBytes(32).toString('base64'),
          uskey_bus_infos_input: `${guid}_${Math.floor(Date.now() / 1_000)}`,
        },
        client_tools: [],
      }),
    })
    const contentType = response.headers.get('content-type') ?? ''
    if (!contentType.includes('text/event-stream')) {
      const payload = await readJsonRecord(response, 'question')
      const code = numberField(payload, 'code')
      throw new ImaError(
        structuredFailure('IMA question failed', code, payload),
        isTransientCode(code),
        isAuthenticationCode(code),
      )
    }
    return parseSse(response, signal)
  }

  private async request(path: string, init: RequestInit & { signal: AbortSignal }): Promise<Response> {
    let response: Response
    try {
      response = await this.fetchImpl(`${this.config.baseUrl}${path}`, { ...init, method: 'POST' })
    } catch (error) {
      if (init.signal.aborted) throw init.signal.reason
      throw new ImaError(`IMA network request failed: ${safeErrorMessage(error)}`, true)
    }
    if (!response.ok) {
      throw new ImaError(
        `IMA HTTP request failed (${response.status})`,
        response.status === 408 || response.status === 429 || response.status >= 500,
        response.status === 401 || response.status === 403,
      )
    }
    return response
  }

  private headers(credentials: ImaCredentials, mode: 'json' | 'sse', token?: string): Headers {
    const headers = new Headers({
      accept: mode === 'json' ? 'application/json' : '*/*',
      'accept-language': 'zh-CN,zh;q=0.9',
      'content-type': mode === 'json' ? 'application/json' : 'text/event-stream',
      extension_version: '999.999.999',
      from_browser_ima: '1',
      priority: 'u=1, i',
      referer: 'https://ima.qq.com/wikis',
      'sec-ch-ua': '"Not(A:Brand";v="8", "Chromium";v="144", "Microsoft Edge";v="144"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-origin',
      traceparent: traceparent(),
      'user-agent': userAgent(credentials.xImaCookie),
      'x-ima-bkn': credentials.xImaBkn,
      'x-ima-cookie': credentials.xImaCookie,
    })
    if (mode === 'sse') headers.set('cache-control', 'no-cache')
    if (token !== undefined) headers.set('authorization', `Bearer ${token}`)
    return headers
  }
}

function normalizeCredentials(credentials: ImaCredentials): ImaCredentials {
  return {
    xImaCookie: normalizeImaHeaderCredential(credentials.xImaCookie, 'X-Ima-Cookie'),
    xImaBkn: normalizeImaHeaderCredential(credentials.xImaBkn, 'X-Ima-Bkn'),
  }
}

async function parseSse(response: Response, signal: AbortSignal): Promise<ParsedSse> {
  if (response.body === null) throw new ImaError('IMA SSE response has no body', true)
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  const parsed: ParsedSse = { answer: '', references: [], codes: [] }
  try {
    while (true) {
      if (signal.aborted) throw signal.reason
      const { done, value } = await reader.read()
      buffer += decoder.decode(value, { stream: !done })
      const lines = buffer.split(/\r?\n/)
      buffer = lines.pop() ?? ''
      for (const line of lines) consumeSseLine(line, parsed)
      if (done) break
    }
    if (buffer.length > 0) consumeSseLine(buffer, parsed)
  } finally {
    reader.releaseLock()
  }
  parsed.references = deduplicateReferences(parsed.references)
  parsed.codes = [...new Set(parsed.codes)]
  return parsed
}

function consumeSseLine(line: string, parsed: ParsedSse): void {
  const trimmed = line.trim()
  if (trimmed.length === 0 || trimmed.startsWith('event:') || trimmed.startsWith('id:')) return
  const data = trimmed.startsWith('data:') ? trimmed.slice(5).trimStart() : trimmed
  if (data.length === 0 || data === '[DONE]') return
  let payload: unknown
  try {
    payload = JSON.parse(data)
  } catch {
    return
  }
  consumePayload(payload, parsed)
}

function consumePayload(payload: unknown, parsed: ParsedSse): void {
  if (!isRecord(payload)) return
  const directCode = numberField(payload, 'code') ?? numberField(payload, 'Code')
  if (directCode !== undefined) parsed.codes.push(directCode)

  const blockType = stringField(payload, 'Type')
  const blockData = payload.Data
  if (blockType === 'blockMessage' && isRecord(blockData)) {
    const textMessage = blockData.text_message
    if (isRecord(textMessage)) {
      const text = stringField(textMessage, 'Text')
      if (text !== undefined && text.length > 0) appendAnswer(parsed, text)
    }
  }

  const medias = Array.isArray(payload.medias) ? payload.medias : []
  for (const media of medias) {
    const reference = referenceOf(media)
    if (reference !== undefined) parsed.references.push(reference)
  }

  if (Array.isArray(payload.msgs)) {
    for (const message of payload.msgs) consumeMessage(message, parsed)
  }
  for (const candidate of [payload.content, payload.Text, payload.answer]) {
    if (typeof candidate === 'string' && candidate.length > 0) appendAnswer(parsed, candidate)
  }
}

function consumeMessage(message: unknown, parsed: ParsedSse): void {
  if (!isRecord(message)) return
  const content = message.content
  if (typeof content === 'string') {
    appendAnswer(parsed, content)
    return
  }
  if (!isRecord(content)) return
  const answer = stringField(content, 'answer')
  if (answer !== undefined) {
    try {
      const decoded: unknown = JSON.parse(answer)
      if (isRecord(decoded) && typeof decoded.Text === 'string') appendAnswer(parsed, decoded.Text)
      else appendAnswer(parsed, answer)
    } catch {
      appendAnswer(parsed, answer)
    }
  }
  const contextRefs = stringField(content, 'context_refs')
  if (contextRefs === undefined) return
  try {
    const decoded: unknown = JSON.parse(contextRefs)
    if (!isRecord(decoded) || !Array.isArray(decoded.medias)) return
    for (const media of decoded.medias) {
      const reference = referenceOf(media)
      if (reference !== undefined) parsed.references.push(reference)
    }
  } catch {
    return
  }
}

function appendAnswer(parsed: ParsedSse, text: string): void {
  if (text.startsWith(parsed.answer)) parsed.answer = text
  else if (!parsed.answer.endsWith(text)) parsed.answer += text
}

function referenceOf(value: unknown): ImaReference | undefined {
  if (!isRecord(value)) return undefined
  const id = stringField(value, 'id')
  const title = stringField(value, 'title')
  if (id === undefined || title === undefined) return undefined
  const reference: ImaReference = { id, title }
  const subtitle = stringField(value, 'subtitle')
  const introduction = stringField(value, 'introduction')
  const timestamp = numberField(value, 'timestamp')
  if (subtitle !== undefined) reference.subtitle = subtitle
  if (introduction !== undefined) reference.introduction = introduction
  if (timestamp !== undefined) reference.timestamp = timestamp
  const kb = value.knowledge_base_info
  if (isRecord(kb) && typeof kb.name === 'string') reference.knowledgeBase = kb.name
  return reference
}

function deduplicateReferences(references: ImaReference[]): ImaReference[] {
  const seen = new Set<string>()
  return references.filter((reference) => {
    if (seen.has(reference.id)) return false
    seen.add(reference.id)
    return true
  })
}

async function readJsonRecord(response: Response, operation: string): Promise<Record<string, unknown>> {
  let value: unknown
  try {
    value = await response.json()
  } catch {
    throw new ImaError(`IMA ${operation} returned invalid JSON`)
  }
  if (!isRecord(value)) throw new ImaError(`IMA ${operation} returned a non-object response`)
  return value
}

function cookieValue(cookie: string, name: string): string | undefined {
  const entry = cookie.split(';').map(part => part.trim()).find(part => part.startsWith(`${name}=`))
  if (entry === undefined) return undefined
  const raw = entry.slice(name.length + 1)
  try {
    return decodeURIComponent(raw)
  } catch {
    return raw
  }
}

function replaceCookieValue(cookie: string, name: string, value: string): string {
  const parts = cookie.split(';').map(part => part.trim()).filter(Boolean)
  const index = parts.findIndex(part => part.startsWith(`${name}=`))
  if (index >= 0) parts[index] = `${name}=${value}`
  else parts.push(`${name}=${value}`)
  return parts.join('; ')
}

function userAgent(cookie: string): string {
  return cookieValue(cookie, 'IMA-IUA')
    ?? 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/144.0.0.0 Safari/537.36'
}

function traceparent(): string {
  return `00-${randomBytes(16).toString('hex')}-${randomBytes(8).toString('hex')}-01`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function stringField(value: Record<string, unknown>, key: string): string | undefined {
  return typeof value[key] === 'string' ? value[key] : undefined
}

function numberField(value: Record<string, unknown>, key: string): number | undefined {
  return typeof value[key] === 'number' && Number.isFinite(value[key]) ? value[key] : undefined
}

function structuredFailure(prefix: string, code: number | undefined, payload: Record<string, unknown>): string {
  const message = safeServerMessage(stringField(payload, 'msg'))
  return `${prefix} (code ${code ?? 'unknown'})${message === undefined ? '' : `: ${message}`}`
}

function safeServerMessage(message: string | undefined): string | undefined {
  if (message === undefined) return undefined
  const cleaned = message
    .replace(/[\u0000-\u001f\u007f]+/gu, ' ')
    .replace(/\b(token|cookie|authorization)\s*[:=]\s*\S+/giu, '$1=[redacted]')
    .replace(/\s+/gu, ' ')
    .trim()
    .slice(0, 200)
  return cleaned.length === 0 ? undefined : cleaned
}

function isAuthenticationCode(code: number | undefined): boolean {
  return code === 41 || code === 110031 || code === 600001 || code === 600002 || code === 600003
}

function isTransientCode(code: number | undefined): boolean {
  return code === 3
}

function cleanAnswer(answer: string): string {
  return answer.split(/\r?\n/).map(line => line.trim()).join('\n').replace(/\n{3,}/g, '\n\n').trim()
}

function safeErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function abortableDelay(milliseconds: number, signal: AbortSignal): Promise<void> {
  if (signal.aborted) return Promise.reject(signal.reason)
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort)
      resolve()
    }, milliseconds)
    const onAbort = (): void => {
      clearTimeout(timer)
      reject(signal.reason)
    }
    signal.addEventListener('abort', onAbort, { once: true })
  })
}
