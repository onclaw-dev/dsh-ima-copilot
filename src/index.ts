/** Native DeepSeek Harness Host plugin for Tencent IMA Copilot. */
import { Config, resolveConfig, type Config as ImaPluginConfig } from './config.js'
import { createHostContract, type ImaSettingsScope } from './compat/host.js'
import { ImaClient } from './ima-client.js'
import { createImaTool } from './tool.js'

export { Config, resolveConfig }
export type { ImaPluginConfig }
export { ImaClient, ImaError } from './ima-client.js'
export {
  IMA_TOOL_NAME, createImaTool, parseKnowledgeBaseIds, resolveRuntimeState, selectKnowledgeBase,
} from './tool.js'
export type { ImaRuntimeState } from './tool.js'
export type { ImaAnswer, ImaCredentials, ImaReference } from './types.js'
export {
  IMA_CREDENTIAL_REFS, IMA_KNOWLEDGE_BASE_IDS_REF, IMA_RUNTIME_REFS,
  IMA_X_IMA_BKN_REF, IMA_X_IMA_COOKIE_REF,
} from './credential-refs.js'

/** Cordis plugin name used by Harness loader diagnostics. */
export const name = 'dsh-ima-copilot'

/** Harness services required by the Host entry. */
export const inject = ['tools', 'credentials']

/** Settings namespace paired with the Web configuration card. */
export const IMA_SETTINGS_NAMESPACE = 'ima-copilot'

/**
 * Register the native IMA tool for this plugin fiber.
 * @param ctx - Harness Host context.
 * @param config - validated bundle configuration.
 */
export function apply(context: unknown, config: ImaPluginConfig): void {
  const host = createHostContract(context)
  let settingsScope: ImaSettingsScope<ImaPluginConfig> | undefined
  const source = (): ImaPluginConfig => settingsScope?.get() ?? config
  let disposeTool: () => void = () => {}
  const registerTool = (): void => {
    disposeTool()
    const resolved = resolveConfig(source())
    disposeTool = host.registerTool(createImaTool(host, resolved, new ImaClient(resolved)))
  }

  host.effect(() => {
    registerTool()
    return () => { disposeTool() }
  }, 'ima-copilot: native tool registration')

  host.withSettings(IMA_SETTINGS_NAMESPACE, Config, {
    base: config,
    validate: (value) => { resolveConfig(value) },
  }, (scope, settingsHost) => {
    settingsScope = scope
    registerTool()
    const unwatch = scope.watch(() => { registerTool() })
    settingsHost.effect(() => () => {
      unwatch()
      if (settingsScope === scope) settingsScope = undefined
    }, 'ima-copilot: settings section')
  })
}
