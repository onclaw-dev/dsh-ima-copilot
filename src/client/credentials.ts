import type { IApiClient } from '@deepseek-ai/dsh-client-connection/client'
import { IMA_RUNTIME_REFS } from '../credential-refs.js'

export { IMA_RUNTIME_REFS }

/** Browser-safe status for one write-only credential. */
export interface CredentialState {
  configured: boolean
  writable: boolean
  source?: string
}

/**
 * Describe IMA references without reading secret literals.
 * @param credentials - Harness credential wire API.
 * @returns safe status keyed by reference.
 */
export async function describeImaSettings(
  credentials: Pick<IApiClient, 'credentials'>['credentials'],
): Promise<Record<string, CredentialState>> {
  const response = await credentials.describe({ refs: [...IMA_RUNTIME_REFS] })
  if (!response.result.ok) throw new Error(response.result.error.message)
  const next: Record<string, CredentialState> = {}
  for (const ref of IMA_RUNTIME_REFS) {
    const view = response.result.value.credentials[ref]
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
 * @param credentials - Harness credential wire API.
 * @param values - user-entered values keyed by reference.
 */
export async function saveImaSettings(
  credentials: Pick<IApiClient, 'credentials'>['credentials'],
  values: Readonly<Record<string, string>>,
): Promise<void> {
  for (const ref of IMA_RUNTIME_REFS) {
    const value = values[ref]?.trim()
    if (value !== undefined && value.length > 0) await credentials.set({ ref, value })
  }
}
