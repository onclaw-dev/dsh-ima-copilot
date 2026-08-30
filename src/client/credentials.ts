import type { ClientRemote } from '@deepseek-ai/dsh-api-remotes/client'
import { IMA_RUNTIME_REFS } from '../credential-refs.js'

export { IMA_RUNTIME_REFS }

/** Browser-safe status for one write-only credential. */
export interface CredentialState {
  configured: boolean
  writable: boolean
  source?: string
}

/** Credential Remote namespace selected by the Web Client assembly. */
export type CredentialsRemote = ClientRemote['credentials']

/**
 * Describe IMA references without reading secret literals.
 * @param credentials - Harness credential wire API.
 * @returns safe status keyed by reference.
 */
export async function describeImaSettings(
  credentials: Pick<CredentialsRemote, 'describe'>,
): Promise<Record<string, CredentialState>> {
  const response = await credentials.describe([...IMA_RUNTIME_REFS])
  if (!response.ok) throw new Error(response.error.message)
  const next: Record<string, CredentialState> = {}
  for (const ref of IMA_RUNTIME_REFS) {
    const view = response.value[ref]
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
  credentials: Pick<CredentialsRemote, 'set'>,
  values: Readonly<Record<string, string>>,
): Promise<void> {
  for (const ref of IMA_RUNTIME_REFS) {
    const value = values[ref]?.trim()
    if (value !== undefined && value.length > 0) {
      const response = await credentials.set(ref, value)
      if (!response.ok) throw new Error(response.error.message)
    }
  }
}
