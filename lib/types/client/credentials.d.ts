import { IMA_RUNTIME_REFS } from '../credential-refs.js';
import type { CredentialState, ImaCredentialsClient } from '../compat/client.js';
export { IMA_RUNTIME_REFS };
/** Browser-safe status for one write-only credential. */
export type { CredentialState, ImaCredentialsClient };
/**
 * Describe IMA references without reading secret literals.
 * @param credentials - Harness credential wire API.
 * @returns safe status keyed by reference.
 */
export declare function describeImaSettings(credentials: Pick<ImaCredentialsClient, 'describe'>): Promise<Record<string, CredentialState>>;
/**
 * Write only non-empty staged values.
 * @param credentials - Harness credential wire API.
 * @param values - user-entered values keyed by reference.
 */
export declare function saveImaSettings(credentials: Pick<ImaCredentialsClient, 'set'>, values: Readonly<Record<string, string>>): Promise<void>;
//# sourceMappingURL=credentials.d.ts.map