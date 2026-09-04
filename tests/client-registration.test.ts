import { describe, expect, it, vi } from 'vitest'
import { apply, inject } from '../src/client/index.js'

describe('IMA settings section registration', () => {
  it('waits for dshloader UI and slots without depending on connection RPC', () => {
    expect(inject).toEqual(['dshLoaderUi', 'slots'])
  })

  it('registers a standalone settings section', () => {
    const register = vi.fn(() => vi.fn())
    const slots = {
      inject: vi.fn((_name: string, install: () => unknown) => install()),
      register,
    }
    const ctx = { slots }

    apply(ctx as never)

    expect(slots.inject).toHaveBeenCalledWith('settings.section', expect.any(Function))
    expect(register).toHaveBeenCalledTimes(1)
    const [options] = register.mock.calls[0]!
    expect(options).toMatchObject({
      name: 'settings.section',
      id: 'ima-copilot',
      label: 'IMA Copilot',
    })
  })
})
