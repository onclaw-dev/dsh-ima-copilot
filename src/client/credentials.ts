import {
  IMA_RUNTIME_REFS, IMA_X_IMA_BKN_REF, IMA_X_IMA_COOKIE_REF,
} from '../credential-refs.js'
import { normalizeImaHeaderCredential } from '../credential-values.js'

export { IMA_RUNTIME_REFS }

/** Browser-safe status for one write-only credential. */
export interface CredentialState {
  configured: boolean
  writable: boolean
  source?: string
}

interface ApiSuccess<T> {
  ok: true
  value: T
}

interface ApiFailure {
  ok: false
  error: { code?: string; message?: string }
}

const API_PREFIX = '/api/ima-copilot/credentials'

async function call<T>(operation: 'describe' | 'set', body: unknown): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${API_PREFIX}/${operation}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch (error) {
    throw new Error(`IMA settings request failed: ${error instanceof Error ? error.message : String(error)}`)
  }
  const payload = await response.json().catch(() => undefined) as ApiSuccess<T> | ApiFailure | undefined
  if (!response.ok || payload?.ok !== true) {
    const message = payload?.ok === false ? payload.error.message : undefined
    throw new Error(message ?? `IMA settings request failed with HTTP ${response.status}`)
  }
  return payload.value
}

/**
 * Describe IMA references without reading secret literals.
 * @returns safe status keyed by reference.
 */
export async function describeImaSettings(): Promise<Record<string, CredentialState>> {
  const response = await call<{ credentials: Record<string, CredentialState> }>('describe', {})
  const next: Record<string, CredentialState> = {}
  for (const ref of IMA_RUNTIME_REFS) {
    const view = response.credentials[ref]
    next[ref] = {
      configured: view?.configured ?? false,
      writable: view?.writable ?? true,
      ...(view?.source === undefined ? {} : { source: view.source }),
    }
  }
  return next
}

/**
 * Write only non-empty staged values.
 * @param values - user-entered values keyed by reference.
 */
export async function saveImaSettings(
  values: Readonly<Record<string, string>>,
): Promise<void> {
  const updates: Record<string, string> = {}
  for (const ref of IMA_RUNTIME_REFS) {
    let value = values[ref]?.trim()
    if (value !== undefined && value.length > 0) {
      if (ref === IMA_X_IMA_COOKIE_REF) value = normalizeImaHeaderCredential(value, 'X-Ima-Cookie')
      if (ref === IMA_X_IMA_BKN_REF) value = normalizeImaHeaderCredential(value, 'X-Ima-Bkn')
      updates[ref] = value
    }
  }
  if (Object.keys(updates).length > 0) await call('set', { values: updates })
}
