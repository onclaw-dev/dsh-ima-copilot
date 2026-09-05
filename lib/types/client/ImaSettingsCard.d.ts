import { type ImaCredentialsClient } from './credentials.js';
/** Injected browser operations for the IMA settings card. */
export interface ImaSettingsCardFace {
    credentials: ImaCredentialsClient;
}
export type ImaSettingsCardProps = ImaSettingsCardFace;
/** Harness settings card for dynamic IMA authentication and knowledge-base state. */
export declare function ImaSettingsCard(props: ImaSettingsCardProps): import("react").JSX.Element;
//# sourceMappingURL=ImaSettingsCard.d.ts.map