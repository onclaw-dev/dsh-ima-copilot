/** Minimal dshloader-facing contracts used by this plugin. */
export interface CredentialInfo {
    configured: boolean;
    source?: string;
    writable: boolean;
}
export interface ResolvedCredential {
    value: string;
    source: string;
}
export interface CredentialsService {
    resolve(ref: unknown): Promise<ResolvedCredential | undefined>;
    describe(ref: unknown): Promise<CredentialInfo>;
    set(ref: unknown, value: string): Promise<void>;
    unset(ref: unknown): Promise<void>;
}
export interface ToolsService {
    register(tool: unknown): () => void;
}
export interface SettingsScope<T> {
    get(): T;
    watch(callback: (value: T) => void): () => void;
}
export interface HttpRequest extends AsyncIterable<string | Uint8Array> {
    method?: string;
    url?: string;
    headers: Record<string, string | string[] | undefined>;
}
export interface HttpResponse {
    writeHead(status: number, headers?: Record<string, string>): void;
    end(body?: string): void;
}
export interface DshLoaderApi {
    services: {
        get<T = unknown>(name: string): T | undefined;
    };
    settings: {
        namespace(id: string): unknown;
        register<T>(namespace: unknown, schema: unknown, options?: {
            base?: T;
            validate?: (value: T) => void;
        }): SettingsScope<T> | undefined;
    };
    web: {
        register(prefix: string, handler: (request: HttpRequest, response: HttpResponse) => void | Promise<void>): () => void;
    };
    dsh: {
        tools: {
            defineTool<T>(definition: T): T;
        };
        credentials: {
            credentialRef(ref: string): unknown;
        };
    };
}
export interface ImaHostContext {
    dshLoader: DshLoaderApi;
    effect(fn: () => void | (() => void), label?: string): void;
    inject(services: string[], callback: (ctx: ImaHostContext) => void): void;
}
export interface WebRuntimeService {
    trustedHosts?: readonly string[];
}
//# sourceMappingURL=dsh-contract.d.ts.map