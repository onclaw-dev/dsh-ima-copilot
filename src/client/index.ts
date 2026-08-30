import type { ConnectionHandle } from '@deepseek-ai/dsh-client-connection/client'
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings-plugins/client'
import { ImaSettingsCard, type ImaSettingsCardFace } from './ImaSettingsCard.js'

/** Browser services required by the IMA settings contribution. */
export const inject = ['slots', 'connection']

/**
 * Add the IMA authentication card to Settings > Plugins > Configurable.
 * @param ctx - Harness browser context.
 */
export function apply(ctx: ClientContext): void {
  const { api } = ctx.get('connection') as ConnectionHandle
  ctx.slots.inject('settings.plugin.item', () => ctx.slots.register({
    name: 'settings.plugin.item',
    id: 'ima-copilot',
    order: 30,
    inject: (): ImaSettingsCardFace => ({ credentials: api.credentials }),
  }, ImaSettingsCard))
}

export { ImaSettingsCard } from './ImaSettingsCard.js'
export type { ImaSettingsCardFace } from './ImaSettingsCard.js'
export { describeImaSettings, IMA_RUNTIME_REFS, saveImaSettings } from './credentials.js'
export type { CredentialState } from './credentials.js'
