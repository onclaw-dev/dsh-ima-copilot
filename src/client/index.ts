import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-api-remotes/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings-plugins/client'
import { ImaSettingsCard, type ImaSettingsCardFace } from './ImaSettingsCard.js'

/** Browser services required by the IMA settings contribution. */
export const inject = ['slots', 'remote', 'remote.credentials']

/**
 * Add the IMA authentication card to Settings > Plugins > Configurable.
 * @param ctx - Harness browser context.
 */
export function apply(ctx: ClientContext): void {
  ctx.slots.inject('settings.plugin.item', () => ctx.slots.register({
    name: 'settings.plugin.item',
    key: 'ima-copilot',
    inject: (): ImaSettingsCardFace => ({ credentials: ctx.remote.credentials }),
  }, ImaSettingsCard))
}

export { ImaSettingsCard } from './ImaSettingsCard.js'
export type { ImaSettingsCardFace } from './ImaSettingsCard.js'
export { describeImaSettings, IMA_RUNTIME_REFS, saveImaSettings } from './credentials.js'
export type { CredentialState } from './credentials.js'
