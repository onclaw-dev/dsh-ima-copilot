import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  describeImaSettings,
  IMA_RUNTIME_REFS,
  saveImaSettings,
} from '../src/client/credentials.js'

function response(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('IMA settings credential HTTP adapter', () => {
  it('maps safe credential status and supplies defaults for missing references', async () => {
    const fetchMock = vi.fn().mockResolvedValue(response({
      ok: true,
      value: {
        credentials: {
          [IMA_RUNTIME_REFS[0]]: { configured: true, writable: false, source: 'profile' },
        },
      },
    }))
    vi.stubGlobal('fetch', fetchMock)

    const result = await describeImaSettings()

    expect(fetchMock).toHaveBeenCalledWith('/api/ima-copilot/credentials/describe', expect.objectContaining({
      method: 'POST',
    }))
    expect(result[IMA_RUNTIME_REFS[0]]).toEqual({ configured: true, writable: false, source: 'profile' })
    expect(result[IMA_RUNTIME_REFS[1]]).toEqual({ configured: false, writable: true })
  })

  it('trims and writes only non-empty staged values in one request', async () => {
    const fetchMock = vi.fn().mockResolvedValue(response({ ok: true, value: {} }))
    vi.stubGlobal('fetch', fetchMock)

    await saveImaSettings({
      [IMA_RUNTIME_REFS[0]]: ' cookie=value ',
      [IMA_RUNTIME_REFS[1]]: '   ',
      [IMA_RUNTIME_REFS[2]]: 'base-one,base-two',
    })

    const init = fetchMock.mock.calls[0]![1] as RequestInit
    expect(JSON.parse(String(init.body))).toEqual({
      values: {
        [IMA_RUNTIME_REFS[0]]: 'cookie=value',
        [IMA_RUNTIME_REFS[2]]: 'base-one,base-two',
      },
    })
  })

  it('removes BOM artifacts before sending header credentials', async () => {
    const fetchMock = vi.fn().mockResolvedValue(response({ ok: true, value: {} }))
    vi.stubGlobal('fetch', fetchMock)

    await saveImaSettings({
      [IMA_RUNTIME_REFS[0]]: 'IMA-UID=user; copied=value\uFEFF; IMA-REFRESH-TOKEN=token',
      [IMA_RUNTIME_REFS[1]]: '\uFEFF123456\uFEFF',
    })

    const init = fetchMock.mock.calls[0]![1] as RequestInit
    expect(JSON.parse(String(init.body)).values).toEqual({
      [IMA_RUNTIME_REFS[0]]: 'IMA-UID=user; copied=value; IMA-REFRESH-TOKEN=token',
      [IMA_RUNTIME_REFS[1]]: '123456',
    })
  })

  it('rejects a visibly truncated credential before sending it', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    await expect(saveImaSettings({
      [IMA_RUNTIME_REFS[0]]: 'IMA-UID=user; omitted=…; IMA-REFRESH-TOKEN=token',
    })).rejects.toThrow('X-Ima-Cookie contains unsupported HTTP header character U+2026')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('surfaces API failures', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({
      ok: false,
      error: { code: 'credential-rejected', message: 'credential update rejected' },
    }, 400)))

    await expect(saveImaSettings({
      [IMA_RUNTIME_REFS[0]]: 'cookie=value',
    })).rejects.toThrow('credential update rejected')
  })
})
