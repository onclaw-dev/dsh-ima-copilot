import {
  IMA_RUNTIME_REFS, IMA_X_IMA_BKN_REF, IMA_X_IMA_COOKIE_REF,
} from '../credential-refs.js'
import { normalizeImaHeaderCredential } from '../credential-values.js'
import type { CredentialState, ImaCredentialsClient } from '../compat/client.js'

export { IMA_RUNTIME_REFS }

/** Browser-safe status for one write-only credential. */
export type { CredentialState, ImaCredentialsClient }

/**
 * Describe IMA references without reading secret literals.
 * @param credentials - Harness credential wire API.
 * @returns safe status keyed by reference.
 */
export async function describeImaSettings(
  credentials: Pick<ImaCredentialsClient, 'describe'>,
): Promise<Record<string, CredentialState>> {
  const response = await credentials.describe(IMA_RUNTIME_REFS)
  const next: Record<string, CredentialState> = {}
  for (const ref of IMA_RUNTIME_REFS) {
    const view = response[ref]
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
  credentials: Pick<ImaCredentialsClient, 'set'>,
  values: Readonly<Record<string, string>>,
): Promise<void> {
  for (const ref of IMA_RUNTIME_REFS) {
    let value = values[ref]?.trim()
    if (value !== undefined && value.length > 0) {
      if (ref === IMA_X_IMA_COOKIE_REF) value = normalizeImaHeaderCredential(value, 'X-Ima-Cookie')
      if (ref === IMA_X_IMA_BKN_REF) value = normalizeImaHeaderCredential(value, 'X-Ima-Bkn')
      await credentials.set(ref, value)
    }
  }
}
