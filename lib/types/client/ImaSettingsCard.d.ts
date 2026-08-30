import type { IApiClient } from '@deepseek-ai/dsh-client-connection/client';
import type { InjectFace, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
/** Injected browser operations for the IMA settings card. */
export interface ImaSettingsCardFace {
    credentials: Pick<IApiClient, 'credentials'>['credentials'];
}
type ImaSettingsCardProps = PropsRuntime<'settings.plugin.item'> & InjectFace<ImaSettingsCardFace>;
/** Harness settings card for dynamic IMA authentication and knowledge-base state. */
export declare function ImaSettingsCard(props: ImaSettingsCardProps): import("react").JSX.Element;
export {};
//# sourceMappingURL=ImaSettingsCard.d.ts.map