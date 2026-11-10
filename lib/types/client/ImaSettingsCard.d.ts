import { type ImaCredentialsClient } from './credentials.js';
/** Injected browser operations for the IMA settings section. */
export interface ImaSettingsCardFace {
    credentials: ImaCredentialsClient;
}
export type ImaSettingsCardProps = ImaSettingsCardFace;
/** Standalone Harness settings page for IMA authentication and knowledge-base state. */
export declare function ImaSettingsCard(props: ImaSettingsCardProps): import("react").JSX.Element;
//# sourceMappingURL=ImaSettingsCard.d.ts.map