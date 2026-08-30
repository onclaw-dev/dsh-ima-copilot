import type { ClientRemote } from '@deepseek-ai/dsh-api-remotes/client';
import { IMA_RUNTIME_REFS } from '../credential-refs.js';
export { IMA_RUNTIME_REFS };
/** Browser-safe status for one write-only credential. */
export interface CredentialState {
    configured: boolean;
    writable: boolean;
    source?: string;
}
/** Credential Remote namespace selected by the Web Client assembly. */
export type CredentialsRemote = ClientRemote['credentials'];
/**
 * Describe IMA references without reading secret literals.
 * @param credentials - Harness credential wire API.
 * @returns safe status keyed by reference.
 */
export declare function describeImaSettings(credentials: Pick<CredentialsRemote, 'describe'>): Promise<Record<string, CredentialState>>;
/**
 * Write only non-empty staged values.
 * @param credentials - Harness credential wire API.
 * @param values - user-entered values keyed by reference.
 */
export declare function saveImaSettings(credentials: Pick<CredentialsRemote, 'set'>, values: Readonly<Record<string, string>>): Promise<void>;
//# sourceMappingURL=credentials.d.ts.map