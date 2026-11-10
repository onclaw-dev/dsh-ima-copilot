import { describe, expect, it, vi } from 'vitest'
import { createHostContract, validateCredentialReference } from '../src/compat/host.js'

function hostFixture() {
  const registerTool = vi.fn(() => vi.fn())
  const resolve = vi.fn().mockResolvedValue({ value: 'resolved', source: 'test' })
  const effect = vi.fn((callback: () => unknown) => callback())
  const context: Record<string, unknown> = { credentials: { resolve }, tools: { register: registerTool }, effect }
  return { context, registerTool, resolve, effect }
}

describe('IMA-BASE-2 Host contract', () => {
  it('validates native string grammars locally', () => {
    expect(validateCredentialReference('IMA_X_IMA_COOKIE')).toBe('IMA_X_IMA_COOKIE')
    expect(() => validateCredentialReference('bad/ref')).toThrow(TypeError)
  })

  it('normalizes credentials, tools, and effect ownership', async () => {
    const fixture = hostFixture()
    const host = createHostContract(fixture.context)
    await expect(host.resolveCredential('IMA_X_IMA_BKN')).resolves.toEqual({ value: 'resolved', source: 'test' })
    const dispose = vi.fn(); fixture.registerTool.mockReturnValue(dispose)
    expect(host.registerTool({ name: 'ima_ask' } as never)).toBe(dispose)
    const install = vi.fn(() => vi.fn())
    host.effect(install, 'test effect')
    expect(fixture.effect).toHaveBeenCalledWith(install, 'test effect')
  })

  it('uses one structural implementation for every audited Host family', () => {
    const fixture = hostFixture()
    const contract = createHostContract(fixture.context)
    expect(contract.contract).toBe('IMA-BASE-2')
  })
})
