import { describe, expect, it, vi } from 'vitest'
import { createGatewayCredentialsAdapter, createLegacyCredentialsAdapter } from '../src/compat/client.js'
import { describeImaSettings, IMA_RUNTIME_REFS, saveImaSettings } from '../src/client/credentials.js'

describe('IMA-BASE-1 credential adapters', () => {
  it('normalizes legacy object requests and nested RPC results', async () => {
    const describe = vi.fn().mockResolvedValue({ result: { ok: true, value: { credentials: {
      [IMA_RUNTIME_REFS[0]]: { configured: true, writable: false, source: 'profile' },
    } } } })
    const set = vi.fn().mockResolvedValue({ result: { ok: true, value: {} } })
    const adapter = createLegacyCredentialsAdapter({ describe, set })
    const result = await describeImaSettings(adapter)
    await saveImaSettings(adapter, {
      [IMA_RUNTIME_REFS[0]]: ' cookie=value ',
      [IMA_RUNTIME_REFS[1]]: ' ',
      [IMA_RUNTIME_REFS[2]]: 'base-one,base-two',
    })
    expect(describe).toHaveBeenCalledWith({ refs: [...IMA_RUNTIME_REFS] })
    expect(result[IMA_RUNTIME_REFS[0]]).toEqual({ configured: true, writable: false, source: 'profile' })
    expect(result[IMA_RUNTIME_REFS[1]]).toEqual({ configured: false, writable: true })
    expect(set.mock.calls).toEqual([
      [{ ref: IMA_RUNTIME_REFS[0], value: 'cookie=value' }],
      [{ ref: IMA_RUNTIME_REFS[2], value: 'base-one,base-two' }],
    ])
  })

  it('normalizes Gateway positional calls and direct results', async () => {
    const describe = vi.fn().mockResolvedValue({ ok: true, value: {
      [IMA_RUNTIME_REFS[0]]: { configured: true, writable: true, source: 'file' },
    } })
    const set = vi.fn().mockResolvedValue({ ok: true, value: undefined })
    const adapter = createGatewayCredentialsAdapter({ describe, set })
    expect(await describeImaSettings(adapter)).toMatchObject({
      [IMA_RUNTIME_REFS[0]]: { configured: true, writable: true, source: 'file' },
    })
    await saveImaSettings(adapter, { [IMA_RUNTIME_REFS[1]]: '\uFEFF123456\uFEFF' })
    expect(describe).toHaveBeenCalledWith([...IMA_RUNTIME_REFS])
    expect(set).toHaveBeenCalledWith(IMA_RUNTIME_REFS[1], '123456')
  })

  it.each([
    ['legacy', createLegacyCredentialsAdapter({
      describe: vi.fn(), set: vi.fn().mockResolvedValue({ result: { ok: false, error: { message: 'write denied' } } }),
    })],
    ['gateway', createGatewayCredentialsAdapter({
      describe: vi.fn(), set: vi.fn().mockResolvedValue({ ok: false, error: { message: 'write denied' } }),
    })],
  ])('surfaces %s failures without leaking the submitted value', async (_name, adapter) => {
    let thrown: unknown
    try { await saveImaSettings(adapter, { [IMA_RUNTIME_REFS[0]]: 'secret-cookie' }) } catch (error) { thrown = error }
    expect(String(thrown)).toContain('write denied')
    expect(String(thrown)).not.toContain('secret-cookie')
  })

  it('rejects a visibly truncated credential before any native write', async () => {
    const set = vi.fn()
    const adapter = createGatewayCredentialsAdapter({ describe: vi.fn(), set })
    await expect(saveImaSettings(adapter, {
      [IMA_RUNTIME_REFS[0]]: 'IMA-UID=user; omitted=…; IMA-REFRESH-TOKEN=token',
    })).rejects.toThrow('X-Ima-Cookie contains unsupported HTTP header character U+2026')
    expect(set).not.toHaveBeenCalled()
  })
})
