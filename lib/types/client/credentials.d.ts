import { IMA_RUNTIME_REFS } from '../credential-refs.js';
export { IMA_RUNTIME_REFS };
/** Browser-safe status for one write-only credential. */
export interface CredentialState {
    configured: boolean;
    writable: boolean;
    source?: string;
}
/**
 * Describe IMA references without reading secret literals.
 * @returns safe status keyed by reference.
 */
export declare function describeImaSettings(): Promise<Record<string, CredentialState>>;
/**
 * Write only non-empty staged values.
 * @param values - user-entered values keyed by reference.
 */
export declare function saveImaSettings(values: Readonly<Record<string, string>>): Promise<void>;
//# sourceMappingURL=credentials.d.ts.map