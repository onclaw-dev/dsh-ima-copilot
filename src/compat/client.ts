/** IMA-BASE-1 Client contract version. Diagnostic metadata only. */
export const IMA_CLIENT_CONTRACT = 'IMA-BASE-1' as const

export interface CredentialState {
  configured: boolean
  writable: boolean
  source?: string
}

export interface ImaCredentialsClient {
  readonly adapter: 'IMA-CLIENT-LEGACY' | 'IMA-CLIENT-GATEWAY'
  describe(refs: readonly string[]): Promise<Record<string, CredentialState>>
  set(ref: string, value: string): Promise<void>
}

export interface ImaClientContext {
  readonly slots?: unknown
  readonly remote?: unknown
  get?(name: string): unknown
}

export interface ImaSlotsClient {
  inject(name: string, install: () => unknown): unknown
  register(options: {
    name: string
    key: string
    inject(): { credentials: ImaCredentialsClient }
  }, component: unknown): unknown
}

interface LegacyResult<T> {
  result: { ok: true; value: T } | { ok: false; error: { message: string } }
}

interface LegacyCredentials {
  describe(request: { refs: string[] }): Promise<LegacyResult<{ credentials: Record<string, CredentialState> }>>
  set(request: { ref: string; value: string }): Promise<LegacyResult<unknown>>
}

interface GatewayResult<T> {
  ok: boolean
  value?: T
  error?: { message?: string }
}

interface GatewayCredentials {
  describe(refs: string[]): Promise<GatewayResult<Record<string, CredentialState>>>
  set(ref: string, value: string): Promise<GatewayResult<void>>
}

export class UnsupportedHarnessClientError extends Error {
  readonly code = 'IMA_UNSUPPORTED_HARNESS_CLIENT'

  constructor(readonly missing: readonly string[]) {
    super(`IMA settings cannot start: missing compatible Client capabilities (${missing.join(', ')})`)
    this.name = 'UnsupportedHarnessClientError'
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function hasMethods(value: unknown, methods: readonly string[]): value is Record<string, (...args: never[]) => Promise<unknown>> {
  return isRecord(value) && methods.every(method => typeof value[method] === 'function')
}

function safeGet(ctx: ImaClientContext, name: string): unknown {
  try {
    return ctx.get?.(name)
  } catch {
    return undefined
  }
}

function messageOf(error: unknown): string {
  if (isRecord(error) && typeof error.message === 'string') return error.message
  return 'Harness credential operation failed'
}

function unwrapGateway<T>(result: GatewayResult<T>): T {
  if (result.ok) return result.value as T
  throw new Error(messageOf(result.error))
}

export function createLegacyCredentialsAdapter(credentials: LegacyCredentials): ImaCredentialsClient {
  return {
    adapter: 'IMA-CLIENT-LEGACY',
    async describe(refs) {
      const response = await credentials.describe({ refs: [...refs] })
      if (!response.result.ok) throw new Error(response.result.error.message)
      return response.result.value.credentials
    },
    async set(ref, value) {
      const response = await credentials.set({ ref, value })
      if (!response.result.ok) throw new Error(response.result.error.message)
    },
  }
}

export function createGatewayCredentialsAdapter(credentials: GatewayCredentials): ImaCredentialsClient {
  return {
    adapter: 'IMA-CLIENT-GATEWAY',
    async describe(refs) {
      return unwrapGateway(await credentials.describe([...refs]))
    },
    async set(ref, value) {
      unwrapGateway(await credentials.set(ref, value))
    },
  }
}

/** Inspect complete capabilities without invoking a credential operation. Gateway wins when both exist. */
export function createClientCredentials(ctx: ImaClientContext): ImaCredentialsClient {
  const remoteRoot = safeGet(ctx, 'remote') ?? ctx.remote
  const remoteCredentials = safeGet(ctx, 'remote.credentials')
    ?? (isRecord(remoteRoot) ? remoteRoot.credentials : undefined)
  if (hasMethods(remoteCredentials, ['describe', 'set'])) {
    return createGatewayCredentialsAdapter(remoteCredentials as unknown as GatewayCredentials)
  }

  const connection = safeGet(ctx, 'connection')
  const legacyCredentials = isRecord(connection) && isRecord(connection.api)
    ? connection.api.credentials
    : undefined
  if (hasMethods(legacyCredentials, ['describe', 'set'])) {
    return createLegacyCredentialsAdapter(legacyCredentials as unknown as LegacyCredentials)
  }

  throw new UnsupportedHarnessClientError([
    'remote.credentials.describe/set',
    'connection.api.credentials.describe/set',
  ])
}

export function getSlotsClient(ctx: ImaClientContext): ImaSlotsClient {
  const slots = safeGet(ctx, 'slots') ?? ctx.slots
  if (!hasMethods(slots, ['inject', 'register'])) {
    throw new UnsupportedHarnessClientError(['slots.inject/register'])
  }
  return slots as unknown as ImaSlotsClient
}

