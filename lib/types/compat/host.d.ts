/** IMA-BASE-1 Host contract version. Diagnostic metadata only. */
export declare const IMA_HOST_CONTRACT: "IMA-BASE-1";
export interface ResolvedCredentialValue {
    value: string;
    source?: string;
}
export interface ImaToolRunContext {
    signal: AbortSignal;
}
export interface ImaToolDefinition {
    readonly name: string;
    readonly description: string;
    readonly parameters: Record<string, unknown>;
    readonly output: {
        readonly schema: Record<string, unknown>;
        render(args: unknown, value: unknown): Array<{
            type: string;
            text?: string;
        }>;
    };
    readonly timeoutMs?: number;
    execute(args: unknown, exec: ImaToolRunContext): Promise<unknown>;
}
export interface ImaToolSpec<Args, Value> {
    readonly name: string;
    readonly description: string;
    readonly parameters: Record<string, unknown>;
    readonly output: {
        readonly schema: Record<string, unknown>;
        render(args: Args, value: Value): Array<{
            type: 'text';
            text: string;
        }>;
    };
    readonly timeoutMs?: number;
    execute(args: Args, exec: ImaToolRunContext): Promise<Value>;
}
export interface ImaSettingsScope<T> {
    get(): T;
    watch(listener: () => void): () => void;
}
/** Host operations consumed by IMA business code. Raw Harness contexts never cross this boundary. */
export interface ImaHostContract {
    readonly contract: typeof IMA_HOST_CONTRACT;
    resolveCredential(ref: string): Promise<ResolvedCredentialValue | undefined>;
    registerTool(tool: ImaToolDefinition): () => void;
    effect(callback: () => void | (() => void), label: string): void;
    withSettings<T>(namespace: string, schema: unknown, options: {
        base: T;
        validate(value: T): void;
    }, install: (scope: ImaSettingsScope<T>, settingsHost: ImaHostContract) => void): void;
}
export declare function validateCredentialReference(value: string): string;
export declare function validateSettingsNamespace(value: string): string;
/** Compile the plugin-owned tool spec at the sole native tools boundary. */
export declare function defineCompatibleTool<Args, Value>(spec: ImaToolSpec<Args, Value>): ImaToolDefinition;
/** Build the shared structural Host adapter accepted by every audited interface family. */
export declare function createHostContract(context: unknown): ImaHostContract;
//# sourceMappingURL=host.d.ts.map