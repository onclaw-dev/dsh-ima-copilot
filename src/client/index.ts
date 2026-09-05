import { ImaSettingsCard, type ImaSettingsCardFace } from './ImaSettingsCard.js'
import {
  createClientCredentials, getSlotsClient, type ImaClientContext,
} from '../compat/client.js'

/** Browser services required by the IMA settings contribution. */
export const inject = ['slots', 'connection', 'remote']

/**
 * Add the IMA authentication card to Settings > Plugins > Configurable.
 * @param ctx - Harness browser context.
 */
export function apply(ctx: ImaClientContext): void {
  const slots = getSlotsClient(ctx)
  const credentials = createClientCredentials(ctx)
  slots.inject('settings.plugin.item', () => slots.register({
    name: 'settings.plugin.item',
    key: 'ima-copilot',
    inject: (): ImaSettingsCardFace => ({ credentials }),
  }, ImaSettingsCard))
}

export { ImaSettingsCard } from './ImaSettingsCard.js'
export type { ImaSettingsCardFace } from './ImaSettingsCard.js'
export { describeImaSettings, IMA_RUNTIME_REFS, saveImaSettings } from './credentials.js'
export type { CredentialState } from './credentials.js'
export {
  createClientCredentials, createGatewayCredentialsAdapter, createLegacyCredentialsAdapter,
  UnsupportedHarnessClientError,
} from '../compat/client.js'
export type { ImaCredentialsClient } from '../compat/client.js'
