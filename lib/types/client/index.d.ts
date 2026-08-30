import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client';
/** Browser services required by the IMA settings contribution. */
export declare const inject: string[];
/**
 * Add the IMA authentication card to Settings > Plugins > Configurable.
 * @param ctx - Harness browser context.
 */
export declare function apply(ctx: ClientContext): void;
export { ImaSettingsCard } from './ImaSettingsCard.js';
export type { ImaSettingsCardFace } from './ImaSettingsCard.js';
export { describeImaSettings, IMA_RUNTIME_REFS, saveImaSettings } from './credentials.js';
export type { CredentialState } from './credentials.js';
//# sourceMappingURL=index.d.ts.map