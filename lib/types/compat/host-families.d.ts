import { type ImaHostContract } from './host.js';
/** Audited native Host family identifiers; never used by business logic for branching. */
export type ImaHostInterfaceFamily = 'IMA-HIF-1' | 'IMA-HIF-2' | 'IMA-HIF-3';
export declare const hostFamilyAdapters: Readonly<Record<ImaHostInterfaceFamily, (context: unknown) => ImaHostContract>>;
//# sourceMappingURL=host-families.d.ts.map