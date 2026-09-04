import {
  IMA_KNOWLEDGE_BASE_IDS_REF,
  IMA_RUNTIME_REFS,
  IMA_X_IMA_BKN_REF,
  IMA_X_IMA_COOKIE_REF,
} from './credential-refs.js'
import { normalizeImaHeaderCredential } from './credential-values.js'
import type {
  CredentialsService,
  HttpRequest,
  HttpResponse,
  ImaHostContext,
  WebRuntimeService,
} from './dsh-contract.js'

export const IMA_CREDENTIAL_API_PREFIX = '/api/ima-copilot/credentials'

const MAX_BODY_BYTES = 128 * 1024
const ALLOWED_REFS = new Set<string>(IMA_RUNTIME_REFS)

class ApiError extends Error {
  constructor(readonly status: number, readonly code: string, message: string) {
    super(message)
  }
}

/** Register the same-origin, write-only browser bridge for IMA credentials. */
export function registerCredentialApi(ctx: ImaHostContext): () => void {
  return ctx.dshLoader.web.register(IMA_CREDENTIAL_API_PREFIX, async (request, response) => {
    if (!isTrustedRequest(ctx, request)) {
      writeError(response, new ApiError(403, 'forbidden', 'forbidden'))
      return
    }
    if (request.method !== 'POST') {
      writeError(response, new ApiError(405, 'method-not-allowed', 'method not allowed'))
      return
    }

    try {
      const pathname = new URL(request.url ?? '/', 'http://dsh.internal').pathname
      const credentials = ctx.dshLoader.services.get<CredentialsService>('credentials')
      if (credentials === undefined) {
        throw new ApiError(503, 'service-unavailable', 'credential service is unavailable')
      }

      if (pathname === `${IMA_CREDENTIAL_API_PREFIX}/describe`) {
        const entries = await Promise.all(IMA_RUNTIME_REFS.map(async ref => {
          const branded = ctx.dshLoader.dsh.credentials.credentialRef(ref)
          return [ref, await credentials.describe(branded)] as const
        }))
        writeOk(response, { credentials: Object.fromEntries(entries) })
        return
      }

      if (pathname === `${IMA_CREDENTIAL_API_PREFIX}/set`) {
        const payload = await readJsonBody(request)
        const values = readValues(payload)
        for (const [ref, raw] of Object.entries(values)) {
          const value = normalizeValue(ref, raw)
          const branded = ctx.dshLoader.dsh.credentials.credentialRef(ref)
          try {
            await credentials.set(branded, value)
          } catch {
            throw new ApiError(400, 'credential-rejected', `credential update rejected for ${ref}`)
          }
        }
        writeOk(response, {})
        return
      }

      throw new ApiError(404, 'not-found', 'unknown credential operation')
    } catch (error) {
      writeError(response, error)
    }
  })
}

function readValues(payload: unknown): Record<string, string> {
  if (payload === null || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new ApiError(400, 'bad-request', 'request body must be an object')
  }
  const candidate = (payload as Record<string, unknown>).values
  if (candidate === null || typeof candidate !== 'object' || Array.isArray(candidate)) {
    throw new ApiError(400, 'bad-request', 'values must be an object')
  }
  const values: Record<string, string> = {}
  for (const [ref, value] of Object.entries(candidate as Record<string, unknown>)) {
    if (!ALLOWED_REFS.has(ref)) throw new ApiError(400, 'bad-request', `unsupported credential reference ${ref}`)
    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new ApiError(400, 'bad-request', `credential ${ref} must be a non-empty string`)
    }
    values[ref] = value
  }
  if (Object.keys(values).length === 0) throw new ApiError(400, 'bad-request', 'no credential updates supplied')
  return values
}

function normalizeValue(ref: string, value: string): string {
  if (ref === IMA_X_IMA_COOKIE_REF) return normalizeImaHeaderCredential(value, 'X-Ima-Cookie')
  if (ref === IMA_X_IMA_BKN_REF) return normalizeImaHeaderCredential(value, 'X-Ima-Bkn')
  if (ref === IMA_KNOWLEDGE_BASE_IDS_REF) return value.trim()
  throw new ApiError(400, 'bad-request', `unsupported credential reference ${ref}`)
}

async function readJsonBody(request: HttpRequest): Promise<unknown> {
  const chunks: Uint8Array[] = []
  let total = 0
  for await (const chunk of request) {
    const buffer = Buffer.from(chunk)
    total += buffer.byteLength
    if (total > MAX_BODY_BYTES) throw new ApiError(413, 'bad-request', 'request body too large')
    chunks.push(buffer)
  }
  const text = Buffer.concat(chunks).toString('utf8')
  if (text.trim().length === 0) return {}
  try {
    return JSON.parse(text) as unknown
  } catch {
    throw new ApiError(400, 'bad-request', 'request body is not valid JSON')
  }
}

function header(request: HttpRequest, name: string): string | undefined {
  const value = request.headers[name]
  return typeof value === 'string' ? value : undefined
}

function authority(value: string): URL | undefined {
  try {
    return new URL(`http://${value}`)
  } catch {
    return undefined
  }
}

function canonicalAuthority(entry: string, parsed: URL): string {
  const port = parsed.port !== '' ? parsed.port : new URL(`https://${entry}`).port
  return port === '' ? parsed.hostname : `${parsed.hostname}:${port}`
}

function isTrustedAuthority(hostUrl: URL, trustedHosts: readonly string[]): boolean {
  return trustedHosts.some(entry => {
    const parsed = authority(entry)
    if (parsed === undefined) return false
    return canonicalAuthority(entry, parsed) === parsed.hostname
      ? parsed.hostname === hostUrl.hostname
      : parsed.host === hostUrl.host
  })
}

function isLoopback(hostname: string): boolean {
  if (hostname === 'localhost' || hostname === '[::1]') return true
  const parts = hostname.split('.')
  return parts.length === 4 && parts[0] === '127'
    && parts.every(part => /^\d{1,3}$/u.test(part) && Number(part) <= 255)
}

function isTrustedRequest(ctx: ImaHostContext, request: HttpRequest): boolean {
  const host = header(request, 'host')
  if (host === undefined) return false
  const hostUrl = authority(host)
  if (hostUrl === undefined) return false
  const runtime = ctx.dshLoader.services.get<WebRuntimeService>('webRuntime')
  const trusted = runtime?.trustedHosts ?? []
  if (!isLoopback(hostUrl.hostname) && !isTrustedAuthority(hostUrl, trusted)) return false
  if (header(request, 'sec-fetch-site') === 'cross-site') return false
  const origin = header(request, 'origin')
  if (origin === undefined) return true
  try {
    return new URL(origin).host === hostUrl.host
  } catch {
    return false
  }
}

function writeJson(response: HttpResponse, status: number, body: unknown): void {
  response.writeHead(status, {
    'cache-control': 'no-store',
    'content-type': 'application/json; charset=utf-8',
    'x-content-type-options': 'nosniff',
  })
  response.end(JSON.stringify(body))
}

function writeOk(response: HttpResponse, value: unknown): void {
  writeJson(response, 200, { ok: true, value })
}

function writeError(response: HttpResponse, error: unknown): void {
  if (error instanceof ApiError) {
    writeJson(response, error.status, { ok: false, error: { code: error.code, message: error.message } })
    return
  }
  writeJson(response, 500, { ok: false, error: { code: 'internal', message: 'credential operation failed' } })
}
