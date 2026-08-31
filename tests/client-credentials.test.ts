import { describe, expect, it, vi } from 'vitest'
import {
  describeImaSettings,
  IMA_RUNTIME_REFS,
  saveImaSettings,
} from '../src/client/credentials.js'

describe('IMA settings credential Remote adapter', () => {
  it('maps safe credential status and supplies defaults for missing references', async () => {
    const describeRemote = vi.fn().mockResolvedValue({
      rpcId: 'describe-ima',
      result: {
        ok: true,
        value: {
          credentials: {
            [IMA_RUNTIME_REFS[0]]: {
              configured: true,
              writable: false,
              source: 'profile',
            },
          },
        },
      },
    })

    const result = await describeImaSettings({
      describe: describeRemote,
    } as unknown as Parameters<typeof describeImaSettings>[0])

    expect(describeRemote).toHaveBeenCalledWith({ refs: [...IMA_RUNTIME_REFS] })
    expect(result[IMA_RUNTIME_REFS[0]]).toEqual({
      configured: true,
      writable: false,
      source: 'profile',
    })
    expect(result[IMA_RUNTIME_REFS[1]]).toEqual({
      configured: false,
      writable: true,
    })
  })

  it('trims and writes only non-empty staged values', async () => {
    const setRemote = vi.fn().mockResolvedValue({
      rpcId: 'set-ima',
      result: { ok: true, value: {} },
    })

    await saveImaSettings({
      set: setRemote,
    } as unknown as Parameters<typeof saveImaSettings>[0], {
      [IMA_RUNTIME_REFS[0]]: ' cookie=value ',
      [IMA_RUNTIME_REFS[1]]: '   ',
      [IMA_RUNTIME_REFS[2]]: 'base-one,base-two',
    })

    expect(setRemote.mock.calls).toEqual([
      [{ ref: IMA_RUNTIME_REFS[0], value: 'cookie=value' }],
      [{ ref: IMA_RUNTIME_REFS[2], value: 'base-one,base-two' }],
    ])
  })

  it('removes BOM artifacts before saving header credentials', async () => {
    const setRemote = vi.fn().mockResolvedValue({
      rpcId: 'set-ima',
      result: { ok: true, value: {} },
    })

    await saveImaSettings({
      set: setRemote,
    } as unknown as Parameters<typeof saveImaSettings>[0], {
      [IMA_RUNTIME_REFS[0]]: 'IMA-UID=user; copied=value\uFEFF; IMA-REFRESH-TOKEN=token',
      [IMA_RUNTIME_REFS[1]]: '\uFEFF123456\uFEFF',
    })

    expect(setRemote.mock.calls).toEqual([
      [{ ref: IMA_RUNTIME_REFS[0], value: 'IMA-UID=user; copied=value; IMA-REFRESH-TOKEN=token' }],
      [{ ref: IMA_RUNTIME_REFS[1], value: '123456' }],
    ])
  })

  it('rejects a visibly truncated credential before saving it', async () => {
    const setRemote = vi.fn()

    await expect(saveImaSettings({
      set: setRemote,
    } as unknown as Parameters<typeof saveImaSettings>[0], {
      [IMA_RUNTIME_REFS[0]]: 'IMA-UID=user; omitted=…; IMA-REFRESH-TOKEN=token',
    })).rejects.toThrow(
      'X-Ima-Cookie contains unsupported HTTP header character U+2026',
    )
    expect(setRemote).not.toHaveBeenCalled()
  })

  it('surfaces Remote failures without attempting later writes', async () => {
    const setRemote = vi.fn().mockResolvedValue({
      rpcId: 'set-ima',
      result: {
        ok: false,
        error: { message: 'write denied' },
      },
    })

    await expect(saveImaSettings({
      set: setRemote,
    } as unknown as Parameters<typeof saveImaSettings>[0], {
      [IMA_RUNTIME_REFS[0]]: 'cookie=value',
      [IMA_RUNTIME_REFS[1]]: 'bkn-value',
    })).rejects.toThrow('write denied')
    expect(setRemote).toHaveBeenCalledTimes(1)
  })
})
