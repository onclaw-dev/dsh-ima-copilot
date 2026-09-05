import { describe, expect, it, vi } from 'vitest'
import type { ImaHostContract } from '../src/compat/host.js'
import { IMA_RUNTIME_REFS } from '../src/credential-refs.js'
import type { ImaClient } from '../src/ima-client.js'
import { createImaTool, resolveRuntimeState } from '../src/tool.js'

function runtimeHost(values: Record<string, string>): ImaHostContract {
  return {
    contract: 'IMA-BASE-1',
    resolveCredential: vi.fn(async ref => values[ref] === undefined ? undefined : { value: values[ref] }),
    registerTool: vi.fn(), effect: vi.fn(), withSettings: vi.fn(),
  }
}

describe('frozen rc.2 IMA tool behavior', () => {
  it('resolves all dynamic values for each operation without retaining secrets', async () => {
    const host = runtimeHost({
      [IMA_RUNTIME_REFS[0]]: 'cookie', [IMA_RUNTIME_REFS[1]]: 'bkn', [IMA_RUNTIME_REFS[2]]: 'one,two,one',
    })
    await expect(resolveRuntimeState(host)).resolves.toEqual({
      credentials: { xImaCookie: 'cookie', xImaBkn: 'bkn' }, knowledgeBaseIds: ['one', 'two'],
    })
    expect(host.resolveCredential).toHaveBeenCalledTimes(3)
  })

  it('preserves schema validation, timeout, execution, cancellation, and rendering', async () => {
    const host = runtimeHost({
      [IMA_RUNTIME_REFS[0]]: 'cookie', [IMA_RUNTIME_REFS[1]]: 'bkn', [IMA_RUNTIME_REFS[2]]: 'base-one',
    })
    const ask = vi.fn().mockResolvedValue({ answer: 'answer', references: [] })
    const tool = createImaTool(host, {
      requestTimeoutMs: 1234, retryCount: 0, concurrencyLimit: 1, baseUrl: 'https://ima.qq.com',
    }, { ask } as unknown as ImaClient)
    const signal = new AbortController().signal
    await expect(tool.execute({ question: '  hello  ' }, { signal })).resolves.toEqual({ answer: 'answer', references: [] })
    expect(ask).toHaveBeenCalledWith('hello', 'base-one', { xImaCookie: 'cookie', xImaBkn: 'bkn' }, signal)
    expect(tool.timeoutMs).toBe(1234)
    expect(tool.output.render({}, { answer: 'answer', references: [] })).toEqual([{ type: 'text', text: 'answer' }])
    await expect(tool.execute({}, { signal })).rejects.toThrow('invalid arguments')
  })
})
