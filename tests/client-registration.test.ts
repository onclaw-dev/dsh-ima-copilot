import { describe, expect, it, vi } from 'vitest'
import { apply, inject } from '../src/client/index.js'
import { createClientCredentials, UnsupportedHarnessClientError } from '../src/compat/client.js'

function slotsFixture() {
  const register = vi.fn(() => vi.fn())
  return { register, inject: vi.fn((_name: string, install: () => unknown) => install()) }
}

describe('IMA capability-routed Client registration', () => {
  it('declares the dsh-v0.2.2-rc.1 services', () => {
    expect(inject).toEqual(['slots', 'connection', 'remote'])
  })

  it('uses the generated Gateway credentials Remote', () => {
    const gateway = { describe: vi.fn(), set: vi.fn() }
    const ctx = { slots: {}, get: (name: string) => name === 'remote.credentials' ? gateway : undefined }
    expect(createClientCredentials(ctx).adapter).toBe('IMA-CLIENT-GATEWAY')
  })

  it('falls back to the legacy connection credential envelope', () => {
    const legacy = { describe: vi.fn(), set: vi.fn() }
    const ctx = { slots: {}, get: (name: string) => name === 'connection' ? { api: { credentials: legacy } } : undefined }
    expect(createClientCredentials(ctx).adapter).toBe('IMA-CLIENT-LEGACY')
  })

  it('keeps credential resolution parked while the section slot is undeclared', () => {
    const register = vi.fn()
    const ctx = {
      slots: { inject: vi.fn(), register }, remote: { credentials: { describe: vi.fn() } },
    }
    expect(() => apply(ctx)).not.toThrow()
    expect(register).not.toHaveBeenCalled()
    expect(ctx.slots.inject).toHaveBeenCalledWith('settings.section', expect.any(Function))
  })

  it('rejects partial protocols when the settings section slot is already live', () => {
    const slots = slotsFixture()
    const ctx = {
      slots,
      remote: { credentials: { describe: vi.fn() } },
    }
    expect(() => apply(ctx)).toThrow(UnsupportedHarnessClientError)
    expect(slots.register).not.toHaveBeenCalled()
  })

  it('waits for the settings section slot before resolving Gateway credentials', () => {
    let install: (() => unknown) | undefined
    const register = vi.fn(() => vi.fn())
    const gateway = { describe: vi.fn(), set: vi.fn() }
    const ctx = {
      slots: {
        inject: vi.fn((_name: string, callback: () => unknown) => { install = callback }),
        register,
      },
      remote: {} as { credentials?: typeof gateway },
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

  it('registers one standalone Settings section with normalized credentials', () => {
    const slots = slotsFixture()
    const native = { describe: vi.fn(), set: vi.fn() }
    const ctx = {
      slots,
      get: (name: string) => name === 'remote.credentials' ? native : undefined,
    }
    apply(ctx)
    expect(slots.register).toHaveBeenCalledTimes(1)
    const [options] = slots.register.mock.calls[0]!
    expect(options).toMatchObject({ name: 'settings.section', id: 'ima-copilot', order: 20, label: 'IMA Copilot' })
    expect(options.inject().credentials.adapter).toBe('IMA-CLIENT-GATEWAY')
  })

  it('gates each credential protocol on its real Cordis service lifecycle', () => {
    const slots = slotsFixture()
    const pending = new Map<string, (ctx: never) => unknown>()
    const dispose = vi.fn()
    const ctx = {
      slots,
      get: (name: string) => name === 'slots' ? slots : undefined,
      inject: vi.fn((services: readonly string[], callback: (ctx: never) => unknown) => {
        pending.set(services[0]!, callback)
        return { dispose }
      }),
    }
    apply(ctx)
    expect([...pending.keys()]).toEqual(['remote.credentials', 'connection'])
    expect(slots.register).not.toHaveBeenCalled()

    const gateway = { describe: vi.fn(), set: vi.fn() }
    pending.get('remote.credentials')?.({
      get: (name: string) => name === 'remote.credentials' ? gateway : undefined,
    } as never)
    expect(slots.register).toHaveBeenCalledTimes(1)
    expect(slots.register.mock.calls[0]![0].inject().credentials.adapter).toBe('IMA-CLIENT-GATEWAY')
  })
})
