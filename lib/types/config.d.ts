import z from '@deepseek-ai/schemastery';
interface VolatileValue<T> {
    get(): T;
}
type CompatibleValue<T> = T | VolatileValue<T>;
/** Runtime configuration supplied by the Harness bundle patch. */
export interface Config {
    /** Total budget for one tool operation. */
    requestTimeoutMs: CompatibleValue<number>;
    /** Additional attempts after the first transient failure. */
    retryCount: CompatibleValue<number>;
    /** Maximum IMA operations in flight. */
    concurrencyLimit: CompatibleValue<number>;
    /** IMA Web origin, configurable for isolated testing and controlled proxies. */
    baseUrl: CompatibleValue<string>;
}
/** Validated Cordis configuration for the IMA plugin. */
export declare const Config: z<Schemastery.ObjectS<NoInfer<{
    requestTimeoutMs: z<number, number, "defined">;
    retryCount: z<number, number, "defined">;
    concurrencyLimit: z<number, number, "defined">;
    baseUrl: z<string, string, "defined">;
}>>, Schemastery.ObjectT<NoInfer<{
    requestTimeoutMs: z<number, number, "defined">;
    retryCount: z<number, number, "defined">;
    concurrencyLimit: z<number, number, "defined">;
    baseUrl: z<string, string, "defined">;
}>>, "plain">;
/** Fully validated static operational configuration. */
export interface ResolvedConfig {
    requestTimeoutMs: number;
    retryCount: number;
    concurrencyLimit: number;
    baseUrl: string;
}
/** Read one coherent operation snapshot from Harness volatile configuration. */
export type ConfigSource = () => ResolvedConfig;
/**
 * Normalize configuration values that require cross-field checks.
 * @param config - schema-validated Cordis configuration.
 * @returns a copy safe for runtime use.
 */
export declare function resolveConfig(config: Config): ResolvedConfig;
export {};
//# sourceMappingURL=config.d.ts.map