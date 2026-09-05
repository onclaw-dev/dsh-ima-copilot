import z from '@deepseek-ai/schemastery'

/** Runtime configuration supplied by the Harness bundle patch. */
export interface Config {
  /** Total budget for one tool operation. */
  requestTimeoutMs: number
  /** Additional attempts after the first transient failure. */
  retryCount: number
  /** Maximum IMA operations in flight. */
  concurrencyLimit: number
  /** IMA Web origin, configurable for isolated testing and controlled proxies. */
  baseUrl: string
}

/** Validated Cordis configuration for the IMA plugin. */
export const Config: z<Config> = z.object({
  requestTimeoutMs: z.number().step(1).min(1).default(300_000),
  retryCount: z.number().step(1).min(0).max(10).default(3),
  concurrencyLimit: z.number().step(1).min(1).max(16).default(1),
  baseUrl: z.string().default('https://ima.qq.com'),
})

/** Fully validated static operational configuration. */
export type ResolvedConfig = Config

/**
 * Normalize configuration values that require cross-field checks.
 * @param config - schema-validated Cordis configuration.
 * @returns a copy safe for runtime use.
 */
export function resolveConfig(config: Config): ResolvedConfig {
  let baseUrl: string
  try {
    const parsed = new URL(config.baseUrl)
    if (parsed.protocol !== 'https:' && parsed.hostname !== '127.0.0.1' && parsed.hostname !== 'localhost') {
      throw new Error('non-HTTPS remote origin')
    }
    baseUrl = parsed.origin
  } catch (error) {
    throw new Error(`ima-copilot: invalid baseUrl: ${error instanceof Error ? error.message : String(error)}`)
  }
  return {
    ...config,
    baseUrl,
  }
}
