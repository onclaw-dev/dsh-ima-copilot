import type { ResolvedConfig } from './config.js';
import type { ImaHostContext } from './dsh-contract.js';
import { ImaClient } from './ima-client.js';
import type { ImaAnswer, ImaCredentials } from './types.js';
/** Stable model-visible tool name used by Harness and Designer discovery. */
export declare const IMA_TOOL_NAME = "ima_ask";
/**
 * Build the native IMA tool around the supplied runtime client.
 * @param ctx - Harness context owning credential resolution.
 * @param config - resolved static plugin configuration.
 * @param client - IMA transport client.
 * @returns registry-ready native tool definition.
 */
export declare function createImaTool(ctx: ImaHostContext, config: ResolvedConfig, client: ImaClient): {
    name: string;
    description: string;
    parameters: {
        question: {
            type: string;
            required: boolean;
            description: string;
        };
        knowledgeBaseId: {
            type: string;
            description: string;
        };
    };
    output: {
        schema: {
            type: string;
            additionalProperties: boolean;
            properties: {
                answer: {
                    type: string;
                    required: boolean;
                };
                references: {
                    type: string;
                    required: boolean;
                    items: {
                        type: string;
                        additionalProperties: boolean;
                        properties: {
                            id: {
                                type: string;
                                required: boolean;
                            };
                            title: {
                                type: string;
                                required: boolean;
                            };
                            subtitle: {
                                type: string;
                            };
                            introduction: {
                                type: string;
                            };
                            timestamp: {
                                type: string;
                            };
                            knowledgeBase: {
                                type: string;
                            };
                        };
                    };
                };
            };
        };
        render: (_args: unknown, value: ImaAnswer) => {
            type: string;
            text: string;
        }[];
    };
    timeoutMs: number;
    execute(args: {
        question: string;
        knowledgeBaseId?: string;
    }, exec: {
        signal: AbortSignal;
    }): Promise<ImaAnswer>;
};
/** Dynamic IMA state checked immediately before one tool operation. */
export interface ImaRuntimeState {
    credentials: ImaCredentials;
    knowledgeBaseIds: string[];
}
/**
 * Resolve and validate all dynamic IMA state without retaining it in plugin state.
 * @param ctx - Harness credential provider context.
 * @returns operation-local authentication and knowledge-base allowlist.
 */
export declare function resolveRuntimeState(ctx: ImaHostContext): Promise<ImaRuntimeState>;
/** Parse the write-only settings value into a stable unique allowlist. */
export declare function parseKnowledgeBaseIds(value: string): string[];
/**
 * Select an allowed knowledge base from tool input and deployment state.
 * @param configured - allowlisted IDs.
 * @param requested - optional tool selector.
 * @returns selected ID.
 */
export declare function selectKnowledgeBase(configured: readonly string[], requested?: string): string;
//# sourceMappingURL=tool.d.ts.map