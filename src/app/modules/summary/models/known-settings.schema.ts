export type SettingsPanelMode = 'system' | 'default-account' | 'default-entity' | 'account' | 'entity';

export type KnownSettingControlType = 'select' | 'boolean' | 'number';

export interface KnownSettingOption {
    labelKey: string;
    value: string;
}

export interface KnownSettingSchemaEntry {
    type: KnownSettingControlType;
    options?: KnownSettingOption[];
    defaultValue: string;
    labelKey: string;
}

export const KNOWN_SETTINGS_SCHEMA: Record<string, KnownSettingSchemaEntry> = {
    language: {
        type: 'select',
        labelKey: 'settings.sharedPanel.keys.language',
        defaultValue: 'en',
        options: [
            { labelKey: 'settings.sharedPanel.options.language.en', value: 'en' },
            { labelKey: 'settings.sharedPanel.options.language.ar', value: 'ar' },
        ],
    },
    theme: {
        type: 'select',
        labelKey: 'settings.sharedPanel.keys.theme',
        defaultValue: 'light',
        options: [
            { labelKey: 'settings.sharedPanel.options.theme.light', value: 'light' },
            { labelKey: 'settings.sharedPanel.options.theme.dark', value: 'dark' },
        ],
    },
    session_validity: {
        type: 'number',
        labelKey: 'settings.sharedPanel.keys.sessionValidity',
        defaultValue: '15',
    },
    reset_password_token_validity: {
        type: 'number',
        labelKey: 'settings.sharedPanel.keys.resetPasswordTokenValidity',
        defaultValue: '15',
    },
};

export function getAllKnownSettingKeys(): string[] {
    return Object.keys(KNOWN_SETTINGS_SCHEMA);
}

export function buildDefaultValuesForKeys(keys: string[]): Record<string, string> {
    const out: Record<string, string> = {};
    keys.forEach((key) => {
        const entry = KNOWN_SETTINGS_SCHEMA[key];
        out[key] = entry ? entry.defaultValue : '';
    });
    return out;
}

export function mergeDictionaryWithDefaultsForKeys(keys: string[], apiDict: Record<string, string>): Record<string, string> {
    const defaults = buildDefaultValuesForKeys(keys);
    const out: Record<string, string> = {};
    keys.forEach((key) => {
        const v = apiDict[key];
        out[key] = v !== undefined && v !== null ? String(v) : defaults[key] ?? '';
    });
    return out;
}

export function getSchemaKeysOrdered(): string[] {
    return getAllKnownSettingKeys();
}

export const ACCOUNT_SETTINGS_KEYS = ['language', 'theme'] as const;

export const SYSTEM_ONLY_SETTING_KEYS = ['session_validity', 'reset_password_token_validity'] as const;

export const SYSTEM_SETTINGS_KEYS = [
    ...ACCOUNT_SETTINGS_KEYS,
    ...SYSTEM_ONLY_SETTING_KEYS,
] as const;

export function getAccountLayerKeys(): string[] {
    return [...ACCOUNT_SETTINGS_KEYS];
}

export function getSystemLayerKeys(): string[] {
    return [...getAllKnownSettingKeys()];
}
