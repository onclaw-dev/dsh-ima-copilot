import { describe, expect, it, vi } from 'vitest'
import { apply, inject } from '../src/client/index.js'
import { createClientCredentials, UnsupportedHarnessClientError } from '../src/compat/client.js'

function slotsFixture() {
  const register = vi.fn(() => vi.fn())
  return { register, inject: vi.fn((_name: string, install: () => unknown) => install()) }
}

describe('IMA capability-routed Client registration', () => {
  it('declares only stable common services', () => {
    expect(inject).toEqual(['slots', 'connection', 'remote'])
  })

  it('selects Gateway when both complete protocols exist', () => {
    const gateway = { describe: vi.fn(), set: vi.fn() }
    const legacy = { describe: vi.fn(), set: vi.fn() }
    const ctx = { remote: { credentials: gateway }, get: (name: string) => name === 'connection' ? { api: { credentials: legacy } } : undefined }
    expect(createClientCredentials(ctx).adapter).toBe('IMA-CLIENT-GATEWAY')
  })

  it('falls back to the legacy connection protocol', () => {
    const credentials = { describe: vi.fn(), set: vi.fn() }
    const ctx = { get: (name: string) => name === 'connection' ? { api: { credentials } } : undefined }
    expect(createClientCredentials(ctx).adapter).toBe('IMA-CLIENT-LEGACY')
  })

  it('contains throwing getters while an undeclared slot keeps capability resolution parked', () => {
    const register = vi.fn()
    const ctx = {
      slots: { inject: vi.fn(), register }, remote: { credentials: { describe: vi.fn() } },
      get: vi.fn(() => { throw new Error('strict missing service') }),
    }
    expect(() => apply(ctx)).not.toThrow()
    expect(register).not.toHaveBeenCalled()
    expect(ctx.slots.inject).toHaveBeenCalledWith('settings.plugin.item', expect.any(Function))
  })

  it('rejects partial protocols when the settings card slot is already live', () => {
    const slots = slotsFixture()
    const ctx = {
      slots,
      remote: { credentials: { describe: vi.fn() } },
      get: vi.fn(() => { throw new Error('strict missing service') }),
    }
    expect(() => apply(ctx)).toThrow(UnsupportedHarnessClientError)
    expect(slots.register).not.toHaveBeenCalled()
  })

  it('waits for the settings card slot before resolving Gateway credentials', () => {
    let install: (() => unknown) | undefined
    const register = vi.fn(() => vi.fn())
    const gateway = { describe: vi.fn(), set: vi.fn() }
    const ctx = {
      slots: {
        inject: vi.fn((_name: string, callback: () => unknown) => { install = callback }),
        register,
      },
      remote: {} as { credentials?: typeof gateway },
      get(name: string) {
        if (name === 'slots') return this.slots
        if (name === 'remote') return this.remote
        if (name === 'remote.credentials') return this.remote.credentials
        return undefined
      },
    }

    expect(() => apply(ctx)).not.toThrow()
    expect(register).not.toHaveBeenCalled()

    ctx.remote.credentials = gateway
    expect(install).toBeTypeOf('function')
    expect(() => install?.()).not.toThrow()
    expect(register).toHaveBeenCalledTimes(1)
    const [options] = register.mock.calls[0]!
    expect(options.inject().credentials.adapter).toBe('IMA-CLIENT-GATEWAY')
  })

  it('registers one keyed card with normalized credentials', () => {
    const slots = slotsFixture()
    const native = { describe: vi.fn(), set: vi.fn() }
    const ctx = { slots, get: vi.fn((name: string) => name === 'connection' ? { api: { credentials: native } } : undefined) }
    apply(ctx)
    expect(slots.register).toHaveBeenCalledTimes(1)
    const [options] = slots.register.mock.calls[0]!
    expect(options).toMatchObject({ name: 'settings.plugin.item', key: 'ima-copilot' })
    expect(options.inject().credentials.adapter).toBe('IMA-CLIENT-LEGACY')
  })
})
