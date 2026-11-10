import z from '@deepseek-ai/schemastery'

interface VolatileValue<T> {
  get(): T
}

type CompatibleValue<T> = T | VolatileValue<T>

/** Runtime configuration supplied by the Harness bundle patch. */
export interface Config {
  /** Total budget for one tool operation. */
  requestTimeoutMs: CompatibleValue<number>
  /** Additional attempts after the first transient failure. */
  retryCount: CompatibleValue<number>
  /** Maximum IMA operations in flight. */
  concurrencyLimit: CompatibleValue<number>
  /** IMA Web origin, configurable for isolated testing and controlled proxies. */
  baseUrl: CompatibleValue<string>
}

function volatileIfSupported<T>(schema: T): T {
  const candidate = schema as T & { volatile?: () => T }
  return typeof candidate.volatile === 'function' ? candidate.volatile() : schema
}

/** Validated Cordis configuration for the IMA plugin. */
export const Config = z.object({
  requestTimeoutMs: volatileIfSupported(z.number().step(1).min(1).default(300_000)),
  retryCount: volatileIfSupported(z.number().step(1).min(0).max(10).default(3)),
  concurrencyLimit: volatileIfSupported(z.number().step(1).min(1).max(16).default(1)),
  baseUrl: volatileIfSupported(z.string().default('https://ima.qq.com')),
})

/** Fully validated static operational configuration. */
export interface ResolvedConfig {
  requestTimeoutMs: number
  retryCount: number
  concurrencyLimit: number
  baseUrl: string
}

/** Read one coherent operation snapshot from Harness volatile configuration. */
export type ConfigSource = () => ResolvedConfig

function isVolatileValue<T>(value: CompatibleValue<T>): value is VolatileValue<T> {
  return typeof value === 'object' && value !== null
    && typeof (value as { get?: unknown }).get === 'function'
}

function readCompatible<T>(value: CompatibleValue<T>): T {
  return isVolatileValue(value) ? value.get() : value as T
}

/**
 * Normalize configuration values that require cross-field checks.
 * @param config - schema-validated Cordis configuration.
 * @returns a copy safe for runtime use.
 */
export function resolveConfig(config: Config): ResolvedConfig {
  const requestTimeoutMs = readCompatible(config.requestTimeoutMs)
  const retryCount = readCompatible(config.retryCount)
  const concurrencyLimit = readCompatible(config.concurrencyLimit)
  const configuredBaseUrl = readCompatible(config.baseUrl)
  let baseUrl: string
  try {
    const parsed = new URL(configuredBaseUrl)
    if (parsed.protocol !== 'https:' && parsed.hostname !== '127.0.0.1' && parsed.hostname !== 'localhost') {
      throw new Error('non-HTTPS remote origin')
    }
    baseUrl = parsed.origin
  } catch (error) {
    throw new Error(`ima-copilot: invalid baseUrl: ${error instanceof Error ? error.message : String(error)}`)
  }
  return {
    requestTimeoutMs,
    retryCount,
    concurrencyLimit,
    baseUrl,
  }
}
