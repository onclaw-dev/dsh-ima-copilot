import { describe, expect, it, vi } from 'vitest'
import { apply, inject } from '../src/client/index.js'

describe('IMA settings card registration for Harness rc.2', () => {
  it('waits for the connection service instead of the unavailable remote.credentials service', () => {
    expect(inject).toEqual(['slots', 'connection'])
  })

  it('registers the card with the rc.2 connection credential API', () => {
    const credentials = { describe: vi.fn(), set: vi.fn(), unset: vi.fn() }
    const register = vi.fn(() => vi.fn())
    const slots = {
      inject: vi.fn((_name: string, install: () => unknown) => install()),
      register,
    }
    const ctx = {
      slots,
      get: vi.fn((name: string) => {
        expect(name).toBe('connection')
        return { api: { credentials } }
      }),
    }

    apply(ctx as never)

    expect(slots.inject).toHaveBeenCalledWith('settings.plugin.item', expect.any(Function))
    expect(register).toHaveBeenCalledTimes(1)
    const [options] = register.mock.calls[0]!
    expect(options).toMatchObject({ name: 'settings.plugin.item', key: 'ima-copilot' })
    expect(options.inject()).toEqual({ credentials })
  })
})
