import type { InjectFace, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
import { type CredentialsRemote } from './credentials.js';
/** Injected browser operations for the IMA settings card. */
export interface ImaSettingsCardFace {
    credentials: CredentialsRemote;
}
type ImaSettingsCardProps = PropsRuntime<'settings.plugin.item'> & InjectFace<ImaSettingsCardFace>;
/** Harness settings card for dynamic IMA authentication and knowledge-base state. */
export declare function ImaSettingsCard(props: ImaSettingsCardProps): import("react").JSX.Element;
export {};
//# sourceMappingURL=ImaSettingsCard.d.ts.map