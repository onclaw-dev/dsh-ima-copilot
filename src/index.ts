/** Native DeepSeek Harness Host plugin for Tencent IMA Copilot. */
import { Config, resolveConfig, type Config as ImaPluginConfig } from './config.js'
import { registerCredentialApi } from './credential-api.js'
import type { ImaHostContext, SettingsScope, ToolsService } from './dsh-contract.js'
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
export const inject = ['dshLoader']

/** Settings namespace paired with the Web configuration card. */
export const IMA_SETTINGS_NAMESPACE = 'ima-copilot'

/**
 * Register the native IMA tool for this plugin fiber.
 * @param ctx - Harness Host context.
 * @param config - validated bundle configuration.
 */
export function apply(ctx: ImaHostContext, config: ImaPluginConfig): void {
  let settingsScope: SettingsScope<ImaPluginConfig> | undefined
  let runtimeCtx: ImaHostContext | undefined
  const source = (): ImaPluginConfig => settingsScope?.get() ?? config
  let disposeTool: () => void = () => {}
  const registerTool = (): void => {
    disposeTool()
    disposeTool = () => {}
    if (runtimeCtx === undefined) return
    const tools = runtimeCtx.dshLoader.services.get<ToolsService>('tools')
    if (tools === undefined) return
    const resolved = resolveConfig(source())
    disposeTool = tools.register(createImaTool(runtimeCtx, resolved, new ImaClient(resolved)))
  }

  ctx.inject(['tools', 'credentials'], (serviceCtx) => {
    runtimeCtx = serviceCtx
    registerTool()
    serviceCtx.effect(() => () => {
      if (runtimeCtx !== serviceCtx) return
      runtimeCtx = undefined
      disposeTool()
      disposeTool = () => {}
    }, 'ima-copilot: native tool registration')
  })

  ctx.inject(['settings'], (settingsCtx) => {
    const scope = settingsCtx.dshLoader.settings.register<ImaPluginConfig>(
      settingsCtx.dshLoader.settings.namespace(IMA_SETTINGS_NAMESPACE),
      Config,
      {
        base: config,
        validate: (value) => { resolveConfig(value) },
      },
    )
    if (scope === undefined) return
    settingsScope = scope
    registerTool()
    const unwatch = scope.watch(() => { registerTool() })
    settingsCtx.effect(() => () => {
      unwatch()
      if (settingsScope === scope) settingsScope = undefined
    }, 'ima-copilot: settings section')
  })

  ctx.effect(
    () => registerCredentialApi(ctx),
    'ima-copilot: credential settings API',
  )
}
