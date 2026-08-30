import { describe, expect, it, vi } from 'vitest'
import {
  describeImaSettings,
  IMA_RUNTIME_REFS,
  saveImaSettings,
} from '../src/client/credentials.js'

describe('IMA settings credential Remote adapter', () => {
  it('maps safe credential status and supplies defaults for missing references', async () => {
    const describeRemote = vi.fn().mockResolvedValue({
      ok: true,
      value: {
        [IMA_RUNTIME_REFS[0]]: {
          configured: true,
          writable: false,
          source: 'profile',
        },
      },
    })

    const result = await describeImaSettings({
      describe: describeRemote,
    } as unknown as Parameters<typeof describeImaSettings>[0])

    expect(describeRemote).toHaveBeenCalledWith([...IMA_RUNTIME_REFS])
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
    const setRemote = vi.fn().mockResolvedValue({ ok: true, value: undefined })

    await saveImaSettings({
      set: setRemote,
    } as unknown as Parameters<typeof saveImaSettings>[0], {
      [IMA_RUNTIME_REFS[0]]: ' cookie=value ',
      [IMA_RUNTIME_REFS[1]]: '   ',
      [IMA_RUNTIME_REFS[2]]: 'base-one,base-two',
    })

    expect(setRemote.mock.calls).toEqual([
      [IMA_RUNTIME_REFS[0], 'cookie=value'],
      [IMA_RUNTIME_REFS[2], 'base-one,base-two'],
    ])
  })

  it('surfaces Remote failures without attempting later writes', async () => {
    const setRemote = vi.fn().mockResolvedValue({
      ok: false,
      error: { message: 'write denied' },
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
