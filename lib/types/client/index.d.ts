import { type ImaClientContext } from '../compat/client.js';
/** Browser services required by the IMA settings contribution. */
export declare const inject: string[];
/**
 * Add the IMA authentication card to Settings > Plugins > Configurable.
 * @param ctx - Harness browser context.
 */
export declare function apply(ctx: ImaClientContext): void;
export { ImaSettingsCard } from './ImaSettingsCard.js';
export type { ImaSettingsCardFace } from './ImaSettingsCard.js';
export { describeImaSettings, IMA_RUNTIME_REFS, saveImaSettings } from './credentials.js';
export type { CredentialState } from './credentials.js';
export { createClientCredentials, createGatewayCredentialsAdapter, createLegacyCredentialsAdapter, UnsupportedHarnessClientError, } from '../compat/client.js';
export type { ImaCredentialsClient } from '../compat/client.js';
//# sourceMappingURL=index.d.ts.map