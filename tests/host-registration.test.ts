import { describe, expect, it, vi } from 'vitest'
import { apply } from '../src/index.js'

describe('frozen rc.2 Host lifecycle behavior', () => {
  it('registers initially, refreshes for settings changes, and owns disposers', () => {
    const toolDisposers: Array<ReturnType<typeof vi.fn>> = []
    const registerTool = vi.fn(() => { const dispose = vi.fn(); toolDisposers.push(dispose); return dispose })
    let watcher: (() => void) | undefined
    const unwatch = vi.fn()
    const settingsScope = { get: () => config, watch: vi.fn((listener: () => void) => { watcher = listener; return unwatch }) }
    const settingsRegister = vi.fn(() => settingsScope)
    const cleanups: Array<() => void> = []
    const context: Record<string, unknown> = {
      tools: { register: registerTool }, credentials: { resolve: vi.fn() },
      effect: vi.fn((install: () => unknown) => { const cleanup = install(); if (typeof cleanup === 'function') cleanups.push(cleanup) }),
    }
    context.inject = vi.fn((_names: string[], callback: (ctx: unknown) => void) => callback({
      ...context, settings: { register: settingsRegister },
    }))
    const config = { requestTimeoutMs: 1000, retryCount: 0, concurrencyLimit: 1, baseUrl: 'https://ima.qq.com' }
    apply(context, config)
    expect(registerTool).toHaveBeenCalledTimes(2)
    expect(settingsRegister).toHaveBeenCalledWith('ima-copilot', expect.anything(), expect.any(Object))
    watcher?.()
    expect(registerTool).toHaveBeenCalledTimes(3)
    expect(toolDisposers[0]).toHaveBeenCalledTimes(1)
    cleanups.reverse().forEach(cleanup => cleanup())
    expect(unwatch).toHaveBeenCalledTimes(1)
    expect(toolDisposers.at(-1)).toHaveBeenCalledTimes(1)
  })
})
