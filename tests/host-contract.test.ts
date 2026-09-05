import { describe, expect, it, vi } from 'vitest'
import { createHostContract, validateCredentialReference, validateSettingsNamespace } from '../src/compat/host.js'
import { hostFamilyAdapters } from '../src/compat/host-families.js'

function hostFixture() {
  const registerTool = vi.fn(() => vi.fn())
  const resolve = vi.fn().mockResolvedValue({ value: 'resolved', source: 'test' })
  const effect = vi.fn((callback: () => unknown) => callback())
  const watch = vi.fn(() => vi.fn())
  const registerSettings = vi.fn(() => ({ get: () => ({ value: 1 }), watch }))
  const context: Record<string, unknown> = { credentials: { resolve }, tools: { register: registerTool }, effect }
  context.inject = vi.fn((_names: string[], callback: (ctx: unknown) => void) => callback({
    ...context, settings: { register: registerSettings },
  }))
  return { context, registerTool, resolve, effect, watch, registerSettings }
}

describe('IMA-BASE-1 Host contract', () => {
  it('validates native string grammars locally', () => {
    expect(validateCredentialReference('IMA_X_IMA_COOKIE')).toBe('IMA_X_IMA_COOKIE')
    expect(validateSettingsNamespace('ima-copilot')).toBe('ima-copilot')
    expect(() => validateCredentialReference('bad/ref')).toThrow(TypeError)
    expect(() => validateSettingsNamespace('IMA Copilot')).toThrow(TypeError)
  })

  it('normalizes credentials, tools, settings, and effect ownership', async () => {
    const fixture = hostFixture()
    const host = createHostContract(fixture.context)
    await expect(host.resolveCredential('IMA_X_IMA_BKN')).resolves.toEqual({ value: 'resolved', source: 'test' })
    const dispose = vi.fn(); fixture.registerTool.mockReturnValue(dispose)
    expect(host.registerTool({ name: 'ima_ask' } as never)).toBe(dispose)
    const install = vi.fn()
    host.withSettings('ima-copilot', {}, { base: { value: 1 }, validate: vi.fn() }, install)
    expect(fixture.registerSettings).toHaveBeenCalledWith('ima-copilot', {}, expect.any(Object))
    expect(install).toHaveBeenCalledWith(expect.objectContaining({ get: expect.any(Function) }), expect.objectContaining({ contract: 'IMA-BASE-1' }))
  })

  it('uses one structural implementation for all audited Host families', () => {
    const fixture = hostFixture()
    const contracts = Object.values(hostFamilyAdapters).map(create => create(fixture.context))
    expect(contracts.map(contract => contract.contract)).toEqual(['IMA-BASE-1', 'IMA-BASE-1', 'IMA-BASE-1'])
  })
})
