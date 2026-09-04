import { ImaSettingsCard } from './ImaSettingsCard.js'

interface ClientSlots {
  inject(name: string, install: () => () => void): () => void
  register(
    options: { name: string; id: string; order?: number; label?: string | (() => string) },
    component: unknown,
  ): () => void
}

interface ClientContext {
  slots: ClientSlots
}

/** Browser services required by the IMA settings contribution. */
export const inject = ['dshLoaderUi', 'slots']

/**
 * Add the IMA authentication card as its own Settings section.
 * @param ctx - Harness browser context.
 */
export function apply(ctx: ClientContext): void {
  ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section',
    id: 'ima-copilot',
    order: 100,
    label: 'IMA Copilot',
  }, ImaSettingsCard))
}

export { ImaSettingsCard } from './ImaSettingsCard.js'
export { describeImaSettings, IMA_RUNTIME_REFS, saveImaSettings } from './credentials.js'
export type { CredentialState } from './credentials.js'
