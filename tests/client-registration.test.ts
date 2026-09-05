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

  it('contains throwing getters and rejects partial protocols before registration', () => {
    const register = vi.fn()
    const ctx = {
      slots: { inject: vi.fn(), register }, remote: { credentials: { describe: vi.fn() } },
      get: vi.fn(() => { throw new Error('strict missing service') }),
    }
    expect(() => apply(ctx)).toThrow(UnsupportedHarnessClientError)
    expect(register).not.toHaveBeenCalled()
    expect(ctx.slots.inject).not.toHaveBeenCalled()
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
