/** Native DeepSeek Harness Host plugin for Tencent IMA Copilot. */
import { Config, resolveConfig, type Config as ImaPluginConfig } from './config.js';
export { Config, resolveConfig };
export type { ImaPluginConfig };
export { ImaClient, ImaError } from './ima-client.js';
export { IMA_TOOL_NAME, createImaTool, parseKnowledgeBaseIds, resolveRuntimeState, selectKnowledgeBase, } from './tool.js';
export type { ImaRuntimeState } from './tool.js';
export type { ImaAnswer, ImaCredentials, ImaReference } from './types.js';
export { IMA_CREDENTIAL_REFS, IMA_KNOWLEDGE_BASE_IDS_REF, IMA_RUNTIME_REFS, IMA_X_IMA_BKN_REF, IMA_X_IMA_COOKIE_REF, } from './credential-refs.js';
/** Cordis plugin name used by Harness loader diagnostics. */
export declare const name = "dsh-ima-copilot";
/** Harness services required by the Host entry. */
export declare const inject: string[];
/** Settings namespace paired with the Web configuration card. */
export declare const IMA_SETTINGS_NAMESPACE = "ima-copilot";
/**
 * Register the native IMA tool for this plugin fiber.
 * @param ctx - Harness Host context.
 * @param config - validated bundle configuration.
 */
export declare function apply(context: unknown, config: ImaPluginConfig): void;
//# sourceMappingURL=index.d.ts.map