import { describe, expect, it, vi } from 'vitest'
import type { ResolvedConfig } from '../src/config.js'
import { ImaClient } from '../src/ima-client.js'

const config: ResolvedConfig = {
  requestTimeoutMs: 5_000,
  retryCount: 0,
  concurrencyLimit: 1,
  baseUrl: 'https://ima.example.test',
}

describe('IMA request credential headers', () => {
  it('removes embedded BOM formatting artifacts before constructing Headers', async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ code: 0, token: 'fresh-token' }))
      .mockResolvedValueOnce(jsonResponse({ code: 0, session_id: 'session-id' }))
      .mockResolvedValueOnce(new Response('data: {"content":"answer"}\n\n', {
        headers: { 'content-type': 'text/event-stream' },
      }))
    const client = new ImaClient(config, fetchImpl as unknown as typeof fetch)

    await expect(client.ask(
      'question',
      'knowledge-base-id',
      {
        xImaCookie: 'IMA-UID=user; copied=value\uFEFF; IMA-REFRESH-TOKEN=refresh-token',
        xImaBkn: '\uFEFF123456\uFEFF',
      },
      new AbortController().signal,
    )).resolves.toEqual({ answer: 'answer', references: [] })

    expect(fetchImpl).toHaveBeenCalledTimes(3)
    for (const [, init] of fetchImpl.mock.calls) {
      const headers = init.headers as Headers
      expect(headers.get('x-ima-cookie')).not.toContain('\uFEFF')
      expect(headers.get('x-ima-bkn')).toBe('123456')
    }
  })

  it('reports other non-ByteString characters without exposing the credential', async () => {
    const fetchImpl = vi.fn()
    const client = new ImaClient(config, fetchImpl as unknown as typeof fetch)

    await expect(client.ask(
      'question',
      'knowledge-base-id',
      {
        xImaCookie: 'IMA-UID=user; IMA-REFRESH-TOKEN=refresh-token',
        xImaBkn: '123😀456',
      },
      new AbortController().signal,
    )).rejects.toThrow(
      'ima_ask: X-Ima-Bkn contains unsupported HTTP header character U+1F600 at index 3',
    )
    expect(fetchImpl).not.toHaveBeenCalled()
  })
})

function jsonResponse(value: unknown): Response {
  return new Response(JSON.stringify(value), {
    headers: { 'content-type': 'application/json' },
  })
}
