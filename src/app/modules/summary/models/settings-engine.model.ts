export type SettingsLayer = 'system' | 'defaultAccount' | 'account' | 'defaultEntity' | 'entity';

export interface SettingsLayersState {
    system: Record<string, string>;
    defaultAccount: Record<string, string>;
    account: Record<string, string>;
    defaultEntity: Record<string, string>;
    entity: Record<string, string>;
    lastUpdatedAt: number;
}

export const SETTINGS_CACHE_KEY = 'erp_settings_layers_cache_v2';

export {
    ACCOUNT_SETTINGS_KEYS,
    SYSTEM_SETTINGS_KEYS,
    getSystemLayerKeys,
} from './known-settings.schema';

export type AccountSettingKey = 'language' | 'theme';

export type SystemSettingKey = AccountSettingKey | 'session_validity' | 'reset_password_token_validity';

export const SETTINGS_LAYER_ORDER: SettingsLayer[] = ['account', 'defaultAccount', 'entity', 'defaultEntity', 'system'];
