/** IMA-BASE-1 Client contract version. Diagnostic metadata only. */
export declare const IMA_CLIENT_CONTRACT: "IMA-BASE-1";
export interface CredentialState {
    configured: boolean;
    writable: boolean;
    source?: string;
}
export interface ImaCredentialsClient {
    readonly adapter: 'IMA-CLIENT-LEGACY' | 'IMA-CLIENT-GATEWAY';
    describe(refs: readonly string[]): Promise<Record<string, CredentialState>>;
    set(ref: string, value: string): Promise<void>;
}
export interface ImaClientContext {
    readonly slots?: unknown;
    readonly remote?: unknown;
    get?(name: string): unknown;
}
export interface ImaSlotsClient {
    inject(name: string, install: () => unknown): unknown;
    register(options: {
        name: string;
        key: string;
        inject(): {
            credentials: ImaCredentialsClient;
        };
    }, component: unknown): unknown;
}
interface LegacyResult<T> {
    result: {
        ok: true;
        value: T;
    } | {
        ok: false;
        error: {
            message: string;
        };
    };
}
interface LegacyCredentials {
    describe(request: {
        refs: string[];
    }): Promise<LegacyResult<{
        credentials: Record<string, CredentialState>;
    }>>;
    set(request: {
        ref: string;
        value: string;
    }): Promise<LegacyResult<unknown>>;
}
interface GatewayResult<T> {
    ok: boolean;
    value?: T;
    error?: {
        message?: string;
    };
}
interface GatewayCredentials {
    describe(refs: string[]): Promise<GatewayResult<Record<string, CredentialState>>>;
    set(ref: string, value: string): Promise<GatewayResult<void>>;
}
export declare class UnsupportedHarnessClientError extends Error {
    readonly missing: readonly string[];
    readonly code = "IMA_UNSUPPORTED_HARNESS_CLIENT";
    constructor(missing: readonly string[]);
}
export declare function createLegacyCredentialsAdapter(credentials: LegacyCredentials): ImaCredentialsClient;
export declare function createGatewayCredentialsAdapter(credentials: GatewayCredentials): ImaCredentialsClient;
/** Inspect complete capabilities without invoking a credential operation. Gateway wins when both exist. */
export declare function createClientCredentials(ctx: ImaClientContext): ImaCredentialsClient;
export declare function getSlotsClient(ctx: ImaClientContext): ImaSlotsClient;
export {};
//# sourceMappingURL=client.d.ts.map