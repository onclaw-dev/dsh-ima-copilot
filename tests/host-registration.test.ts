import { describe, expect, it, vi } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import type { Config } from '../src/config.js'
import { apply } from '../src/index.js'
import * as plugin from '../src/index.js'

function volatile<T>(read: () => T): { get(): T } {
  return { get: read }
}

describe('dsh-v0.2.2-rc.1 Host lifecycle behavior', () => {
  it('accepts the plain configuration values used before Volatile Config', () => {
    const registerTool = vi.fn(() => vi.fn())
    apply({
      tools: { register: registerTool }, credentials: { resolve: vi.fn() },
      effect: (install: () => unknown) => install(),
    }, {
      requestTimeoutMs: 2_000, retryCount: 1, concurrencyLimit: 2, baseUrl: 'https://ima.qq.com',
    })
    expect(registerTool.mock.calls[0]![0].timeoutMs).toBe(2_000)
  })

  it('registers once and reads volatile timeout values without replacing the tool', () => {
    let timeout = 1_000
    const config = {
      requestTimeoutMs: volatile(() => timeout),
      retryCount: volatile(() => 0),
      concurrencyLimit: volatile(() => 1),
      baseUrl: volatile(() => 'https://ima.qq.com'),
    } as Config
    const dispose = vi.fn()
    const registerTool = vi.fn(() => dispose)
    const cleanups: Array<() => void> = []
    const context: Record<string, unknown> = {
      tools: { register: registerTool }, credentials: { resolve: vi.fn() },
      effect: vi.fn((install: () => unknown) => { const cleanup = install(); if (typeof cleanup === 'function') cleanups.push(cleanup) }),
    }
    apply(context, config)
    expect(registerTool).toHaveBeenCalledOnce()
    const tool = registerTool.mock.calls[0]![0]
    expect(tool.timeoutMs).toBe(1_000)
    timeout = 4_000
    expect(tool.timeoutMs).toBe(4_000)
    cleanups.reverse().forEach(cleanup => cleanup())
    expect(dispose).toHaveBeenCalledOnce()
  })

  it('boots through the dsh-v0.2.2-rc.1 Cordis Config pipeline', async () => {
    const ctx = new Context()
    let definition: { timeoutMs?: number } | undefined
    ctx.provide('tools', {
      register(value: { timeoutMs?: number }) {
        definition = value
        return () => { definition = undefined }
      },
    } as never)
    ctx.provide('credentials', { resolve: async () => undefined } as never)
    const fiber = await ctx.plugin(plugin, {
      requestTimeoutMs: 1_234,
      retryCount: 0,
      concurrencyLimit: 2,
      baseUrl: 'https://ima.qq.com',
    })
    expect(definition?.timeoutMs).toBe(1_234)
    await fiber.dispose()
    expect(definition).toBeUndefined()
    await ctx.fiber.dispose()
  })
})
