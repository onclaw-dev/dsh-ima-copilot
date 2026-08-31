window.__ModuleLoader__.load({
	id: "dsh-ima-copilot",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let react_jsx_runtime = require("react/jsx-runtime");
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
		//#region src/client/credentials.ts
		/**
		* Describe IMA references without reading secret literals.
		* @param credentials - Harness credential wire API.
		* @returns safe status keyed by reference.
		*/
		async function describeImaSettings(credentials) {
			const response = await credentials.describe({ refs: [...IMA_RUNTIME_REFS] });
			if (!response.result.ok) throw new Error(response.result.error.message);
			const next = {};
			for (const ref of IMA_RUNTIME_REFS) {
				const view = response.result.value.credentials[ref];
				next[ref] = {
					configured: view?.configured ?? false,
					writable: view?.writable ?? true,
					...view?.source === void 0 ? {} : { source: view.source }
				};
			}
			return next;
		}
		/**
		* Write only non-empty staged values.
		* @param credentials - Harness credential wire API.
		* @param values - user-entered values keyed by reference.
		*/
		async function saveImaSettings(credentials, values) {
			for (const ref of IMA_RUNTIME_REFS) {
				let value = values[ref]?.trim();
				if (value !== void 0 && value.length > 0) {
					if (ref === "IMA_X_IMA_COOKIE") value = normalizeImaHeaderCredential(value, "X-Ima-Cookie");
					if (ref === "IMA_X_IMA_BKN") value = normalizeImaHeaderCredential(value, "X-Ima-Bkn");
					const response = await credentials.set({
						ref,
						value
					});
					if (!response.result.ok) throw new Error(response.result.error.message);
				}
			}
		}
		//#endregion
		//#region src/client/ImaSettingsCard.tsx
		/** Harness settings card for dynamic IMA authentication and knowledge-base state. */
		function ImaSettingsCard(props) {
			const [open, setOpen] = (0, react.useState)(false);
			const [values, setValues] = (0, react.useState)({});
			const [state, setState] = (0, react.useState)({});
			const [saving, setSaving] = (0, react.useState)(false);
			const [error, setError] = (0, react.useState)();
			const refresh = (0, react.useCallback)(async () => {
				setState(await describeImaSettings(props.credentials));
			}, [props.credentials]);
			(0, react.useEffect)(() => {
				refresh().catch((cause) => setError(cause instanceof Error ? cause.message : String(cause)));
			}, [refresh]);
			const save = async () => {
				setSaving(true);
				setError(void 0);
				try {
					await saveImaSettings(props.credentials, values);
					setValues({});
					await refresh();
				} catch (cause) {
					setError(cause instanceof Error ? cause.message : String(cause));
				} finally {
					setSaving(false);
				}
			};
			const stored = IMA_RUNTIME_REFS.every((ref) => state[ref]?.configured === true);
			const dirty = IMA_RUNTIME_REFS.some((ref) => (values[ref]?.trim().length ?? 0) > 0);
			const bodyId = "ima-copilot-settings-body";
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
				style: styles.card,
				"data-testid": "ima-settings-card",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
					type: "button",
					"aria-expanded": open,
					"aria-controls": bodyId,
					"aria-label": `${open ? "收起" : "展开"} IMA Copilot 配置`,
					onClick: () => setOpen((current) => !current),
					style: styles.header,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						style: styles.heading,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							style: styles.titleRow,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", {
								style: styles.title,
								children: "IMA Copilot"
							}), dirty ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								style: styles.pending,
								children: "有未保存修改"
							}) : null]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							style: styles.summary,
							children: "配置 IMA 认证与知识库。"
						})]
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Chevron, { open })]
				}), open ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					id: bodyId,
					style: styles.body,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							style: styles.description,
							children: "更新从 ima.qq.com 获取的认证信息和知识库 ID。ima_ask 会在每次调用前读取最新配置， 无需重启。"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							style: stored ? styles.ready : styles.warning,
							children: stored ? "配置已保存，将在下次调用时验证认证有效性" : "配置不完整，请填写全部三个字段"
						}),
						IMA_CREDENTIAL_REFS.map((ref) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
							style: styles.field,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: styles.label,
									children: ref === "IMA_X_IMA_COOKIE" ? "X-Ima-Cookie" : "X-Ima-Bkn"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									type: "password",
									autoComplete: "off",
									value: values[ref] ?? "",
									placeholder: state[ref]?.configured ? "已配置，输入新值可替换" : "尚未配置",
									disabled: state[ref]?.writable === false || saving,
									onChange: (event) => setValues((current) => ({
										...current,
										[ref]: event.target.value
									})),
									style: styles.input
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(FieldState, { state: state[ref] })
							]
						}, ref)),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
							style: styles.field,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: styles.label,
									children: "知识库 ID"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
									rows: 4,
									value: values["IMA_KNOWLEDGE_BASE_IDS"] ?? "",
									placeholder: state["IMA_KNOWLEDGE_BASE_IDS"]?.configured ? "已配置，输入完整列表可替换" : "每行一个 ID，或使用逗号分隔",
									disabled: state["IMA_KNOWLEDGE_BASE_IDS"]?.writable === false || saving,
									onChange: (event) => setValues((current) => ({
										...current,
										[IMA_KNOWLEDGE_BASE_IDS_REF]: event.target.value
									})),
									style: {
										...styles.input,
										...styles.textarea
									}
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("small", {
									style: styles.hint,
									children: "保存时会替换完整知识库列表，已保存内容不会回显。"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(FieldState, { state: state[IMA_KNOWLEDGE_BASE_IDS_REF] })
							]
						}),
						error === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							role: "alert",
							style: styles.error,
							children: error
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							style: styles.footer,
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								disabled: saving || !dirty,
								onClick: () => {
									save();
								},
								style: styles.saveButton,
								children: saving ? "保存中…" : "保存更新"
							})
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("small", {
							style: styles.hint,
							children: "如果 IMA 返回 code 41，请从同一个当前浏览器请求中重新获取 X-Ima-Cookie 和 X-Ima-Bkn，并同时替换。"
						})
					]
				}) : null]
			});
		}
		function Chevron({ open }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
				"aria-hidden": "true",
				viewBox: "0 0 16 16",
				width: "16",
				height: "16",
				style: {
					...styles.chevron,
					transform: open ? "rotate(180deg)" : "rotate(0deg)"
				},
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
					d: "m4 6 4 4 4-4",
					fill: "none",
					stroke: "currentColor",
					strokeLinecap: "round",
					strokeLinejoin: "round"
				})
			});
		}
		function FieldState({ state }) {
			const source = state?.source === void 0 ? void 0 : {
				file: "本地凭证文件",
				env: "启动环境",
				"project-env": "项目 .env",
				"user-env": "用户 .env"
			}[state.source] ?? state.source;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("small", {
				style: styles.hint,
				children: [state?.configured ? `已配置${source ? `，来源：${source}` : ""}` : "尚未配置", state?.writable === false ? " · 只读" : ""]
			});
		}
		const styles = {
			card: {
				listStyle: "none",
				border: "1px solid var(--dsh-border-color, #d7d7d7)",
				borderRadius: 12,
				overflow: "hidden",
				background: "var(--dsh-card-background, transparent)"
			},
			header: {
				width: "100%",
				border: 0,
				padding: 16,
				display: "flex",
				alignItems: "center",
				justifyContent: "space-between",
				gap: 16,
				background: "transparent",
				color: "inherit",
				textAlign: "left",
				cursor: "pointer",
				font: "inherit"
			},
			heading: {
				minWidth: 0,
				display: "grid",
				gap: 7
			},
			titleRow: {
				display: "flex",
				alignItems: "center",
				gap: 10,
				flexWrap: "wrap"
			},
			title: {
				fontSize: 16,
				lineHeight: 1.35
			},
			summary: {
				opacity: .65,
				lineHeight: 1.4
			},
			pending: {
				borderRadius: 999,
				padding: "2px 8px",
				fontSize: 12,
				fontWeight: 500,
				color: "#9a5b00",
				background: "rgba(196, 122, 0, 0.12)"
			},
			chevron: {
				flex: "0 0 auto",
				opacity: .6,
				transition: "transform 160ms ease"
			},
			body: {
				borderTop: "1px solid var(--dsh-border-color, #e2e2e2)",
				padding: "16px",
				display: "grid",
				gap: 16
			},
			description: {
				margin: 0,
				opacity: .75,
				lineHeight: 1.6
			},
			ready: {
				margin: 0,
				color: "#287a3d"
			},
			warning: {
				margin: 0,
				color: "#a05a00"
			},
			field: {
				display: "grid",
				gap: 7
			},
			label: { fontWeight: 600 },
			input: {
				width: "100%",
				boxSizing: "border-box",
				border: "1px solid var(--dsh-border-color, #c8c8c8)",
				borderRadius: 8,
				padding: "9px 11px",
				background: "transparent",
				color: "inherit",
				font: "inherit"
			},
			textarea: {
				resize: "vertical",
				minHeight: 88
			},
			hint: {
				opacity: .68,
				lineHeight: 1.45
			},
			error: {
				margin: 0,
				color: "#c33"
			},
			footer: {
				borderTop: "1px solid var(--dsh-border-color, #e2e2e2)",
				paddingTop: 12,
				display: "flex",
				justifyContent: "flex-end"
			},
			saveButton: {
				borderRadius: 8,
				padding: "8px 14px",
				cursor: "pointer"
			}
		};
		//#endregion
		//#region src/client/index.ts
		/** Browser services required by the IMA settings contribution. */
		const inject = ["slots", "connection"];
		/**
		* Add the IMA authentication card to Settings > Plugins > Configurable.
		* @param ctx - Harness browser context.
		*/
		function apply(ctx) {
			const { api } = ctx.get("connection");
			ctx.slots.inject("settings.plugin.item", () => ctx.slots.register({
				name: "settings.plugin.item",
				key: "ima-copilot",
				inject: () => ({ credentials: api.credentials })
			}, ImaSettingsCard));
		}
		//#endregion
		exports.IMA_RUNTIME_REFS = IMA_RUNTIME_REFS;
		exports.ImaSettingsCard = ImaSettingsCard;
		exports.apply = apply;
		exports.describeImaSettings = describeImaSettings;
		exports.inject = inject;
		exports.saveImaSettings = saveImaSettings;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map