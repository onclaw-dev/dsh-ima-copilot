import { describe, expect, it, vi } from 'vitest'
import { registerCredentialApi } from '../src/credential-api.js'
import type { HttpRequest, HttpResponse, ImaHostContext } from '../src/dsh-contract.js'
import { IMA_X_IMA_COOKIE_REF } from '../src/credential-refs.js'

function request(path: string, body: unknown, headers: Record<string, string> = {}): HttpRequest {
  const encoded = Buffer.from(JSON.stringify(body))
  return {
    method: 'POST',
    url: path,
    headers: { host: '127.0.0.1:3199', origin: 'http://127.0.0.1:3199', ...headers },
    async *[Symbol.asyncIterator]() {
      yield encoded
    },
  }
}

function response() {
  const state: { status?: number; headers?: Record<string, string>; body?: string } = {}
  const value: HttpResponse = {
    writeHead(status, headers) {
      state.status = status
      state.headers = headers
    },
    end(body) {
      state.body = body
    },
  }
  return { state, value }
}

function harness() {
  let handler: ((request: HttpRequest, response: HttpResponse) => void | Promise<void>) | undefined
  const credentials = {
    resolve: vi.fn(),
    describe: vi.fn().mockResolvedValue({ configured: true, writable: true, source: 'file' }),
    set: vi.fn().mockResolvedValue(undefined),
    unset: vi.fn(),
  }
  const ctx = {
    dshLoader: {
      services: {
        get: vi.fn((name: string) => name === 'credentials' ? credentials : undefined),
      },
      settings: {},
      web: {
        register: vi.fn((_prefix: string, next: typeof handler) => {
          handler = next
          return vi.fn()
        }),
      },
      dsh: {
        tools: {},
        credentials: { credentialRef: (ref: string) => ref },
      },
    },
  } as unknown as ImaHostContext
  registerCredentialApi(ctx)
  if (handler === undefined) throw new Error('credential handler was not registered')
  return { credentials, handler }
}

describe('IMA credential API', () => {
  it('describes only the fixed IMA references without returning values', async () => {
    const { credentials, handler } = harness()
    const output = response()

    await handler(request('/api/ima-copilot/credentials/describe', {}), output.value)

    expect(output.state.status).toBe(200)
    expect(credentials.describe).toHaveBeenCalledTimes(3)
    expect(output.state.headers?.['cache-control']).toBe('no-store')
    expect(output.state.body).not.toContain('secret')
  })

  it('normalizes and writes an allowed credential without echoing it', async () => {
    const { credentials, handler } = harness()
    const output = response()
    const secret = 'IMA-UID=user; copied=value\uFEFF; IMA-REFRESH-TOKEN=token'

    await handler(request('/api/ima-copilot/credentials/set', {
      values: { [IMA_X_IMA_COOKIE_REF]: secret },
    }), output.value)

    expect(credentials.set).toHaveBeenCalledWith(
      IMA_X_IMA_COOKIE_REF,
      'IMA-UID=user; copied=value; IMA-REFRESH-TOKEN=token',
    )
    expect(output.state.body).not.toContain(secret)
  })

  it('rejects arbitrary credential references and cross-site requests', async () => {
    const first = harness()
    const unknown = response()
    await first.handler(request('/api/ima-copilot/credentials/set', {
      values: { SOME_OTHER_SECRET: 'value' },
    }), unknown.value)
    expect(unknown.state.status).toBe(400)
    expect(first.credentials.set).not.toHaveBeenCalled()

    const crossSite = response()
    await first.handler(request('/api/ima-copilot/credentials/describe', {}, {
      'sec-fetch-site': 'cross-site',
    }), crossSite.value)
    expect(crossSite.state.status).toBe(403)
  })
})
