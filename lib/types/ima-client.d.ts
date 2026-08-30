import type { ResolvedConfig } from './config.js';
import type { ImaAnswer, ImaCredentials } from './types.js';
/** IMA failure with an explicit retry classification. */
export declare class ImaError extends Error {
    readonly retryable: boolean;
    readonly authentication: boolean;
    /** @param message - safe diagnostic without secret response content. */
    constructor(message: string, retryable?: boolean, authentication?: boolean);
}
/** IMA Web client owned by the Harness Host plugin. */
export declare class ImaClient {
    private readonly config;
    private readonly fetchImpl;
    private readonly semaphore;
    /**
     * @param config - resolved deployment configuration.
     * @param fetchImpl - fetch implementation; overridden only by isolated tests.
     */
    constructor(config: ResolvedConfig, fetchImpl?: typeof fetch);
    /**
     * Execute one isolated knowledge-base question.
     * @param question - non-empty user question.
     * @param knowledgeBaseId - selected configured knowledge base.
     * @param credentials - secrets resolved for this operation.
     * @param outerSignal - Harness execution cancellation.
     * @returns canonical answer and references.
     */
    ask(question: string, knowledgeBaseId: string, credentials: ImaCredentials, outerSignal: AbortSignal): Promise<ImaAnswer>;
    private refresh;
    private initSession;
    private askSession;
    private request;
    private headers;
}
//# sourceMappingURL=ima-client.d.ts.map