import z from '@deepseek-ai/schemastery';
/** Runtime configuration supplied by the Harness bundle patch. */
export interface Config {
    /** Total budget for one tool operation. */
    requestTimeoutMs: number;
    /** Additional attempts after the first transient failure. */
    retryCount: number;
    /** Maximum IMA operations in flight. */
    concurrencyLimit: number;
    /** IMA Web origin, configurable for isolated testing and controlled proxies. */
    baseUrl: string;
}
/** Validated Cordis configuration for the IMA plugin. */
export declare const Config: z<Config>;
/** Fully validated static operational configuration. */
export type ResolvedConfig = Config;
/**
 * Normalize configuration values that require cross-field checks.
 * @param config - schema-validated Cordis configuration.
 * @returns a copy safe for runtime use.
 */
export declare function resolveConfig(config: Config): ResolvedConfig;
//# sourceMappingURL=config.d.ts.map