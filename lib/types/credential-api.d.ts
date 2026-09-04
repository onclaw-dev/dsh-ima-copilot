import type { ImaHostContext } from './dsh-contract.js';
export declare const IMA_CREDENTIAL_API_PREFIX = "/api/ima-copilot/credentials";
/** Register the same-origin, write-only browser bridge for IMA credentials. */
export declare function registerCredentialApi(ctx: ImaHostContext): () => void;
//# sourceMappingURL=credential-api.d.ts.map