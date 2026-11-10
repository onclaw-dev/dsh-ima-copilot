import { ImaSettingsCard, type ImaSettingsCardFace } from './ImaSettingsCard.js'
import {
  createClientCredentials, findGatewayCredentials, findLegacyCredentials, getSlotsClient,
  type ImaClientContext, type ImaCredentialsClient, type ImaSlotsClient,
} from '../compat/client.js'

/** Browser services required by the IMA settings contribution. */
export const inject = ['slots', 'connection', 'remote']

function registerSection(slots: ImaSlotsClient, credentials: ImaCredentialsClient): unknown {
  return slots.register({
    name: 'settings.section',
    id: 'ima-copilot',
    order: 20,
    label: 'IMA Copilot',
    inject: (): ImaSettingsCardFace => ({ credentials }),
  }, ImaSettingsCard)
}

function installCredentialLifecycle(ctx: ImaClientContext, slots: ImaSlotsClient): unknown {
  if (typeof ctx.inject !== 'function') return registerSection(slots, createClientCredentials(ctx))

  const gateway = ctx.inject(['remote.credentials'], child => {
    const credentials = findGatewayCredentials(child)
    if (credentials) return registerSection(slots, credentials)
  })
  const legacy = ctx.inject(['connection'], child => {
    const credentials = findLegacyCredentials(child)
    if (credentials) return registerSection(slots, credentials)
  })
  return () => {
    void gateway.dispose()
    void legacy.dispose()
  }
}

/** Add the IMA authentication page as a first-class Settings section. */
export function apply(ctx: ImaClientContext): void {
  const slots = getSlotsClient(ctx)
  slots.inject('settings.section', () => installCredentialLifecycle(ctx, slots))
}

export { ImaSettingsCard } from './ImaSettingsCard.js'
export type { ImaSettingsCardFace } from './ImaSettingsCard.js'
export { describeImaSettings, IMA_RUNTIME_REFS, saveImaSettings } from './credentials.js'
export type { CredentialState } from './credentials.js'
export {
  createClientCredentials, createGatewayCredentialsAdapter, createLegacyCredentialsAdapter,
  findGatewayCredentials, findLegacyCredentials,
  UnsupportedHarnessClientError,
} from '../compat/client.js'
export type { ImaCredentialsClient } from '../compat/client.js'
