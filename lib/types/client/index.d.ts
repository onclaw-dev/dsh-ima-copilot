interface ClientSlots {
    inject(name: string, install: () => () => void): () => void;
    register(options: {
        name: string;
        id: string;
        order?: number;
        label?: string | (() => string);
    }, component: unknown): () => void;
}
interface ClientContext {
    slots: ClientSlots;
}
/** Browser services required by the IMA settings contribution. */
export declare const inject: string[];
/**
 * Add the IMA authentication card as its own Settings section.
 * @param ctx - Harness browser context.
 */
export declare function apply(ctx: ClientContext): void;
export { ImaSettingsCard } from './ImaSettingsCard.js';
export { describeImaSettings, IMA_RUNTIME_REFS, saveImaSettings } from './credentials.js';
export type { CredentialState } from './credentials.js';
//# sourceMappingURL=index.d.ts.map