import { KNOWN_SETTINGS_SCHEMA } from '../models/known-settings.schema';

export interface AvailableKeyOption {
    value: string;
    labelKey?: string;
    isUnknownKey?: boolean;
}

export function collectPersistedUnknownKeys(
    persisted: Record<string, string>,
    schemaKeys: Set<string>
): string[] {
    return Object.keys(persisted || {}).filter((k) => !schemaKeys.has(k));
}

export function buildAvailableKeyOptions(
    schemaKeyList: string[],
    persisted: Record<string, string>,
    activeKeys: string[]
): AvailableKeyOption[] {
    const schemaKeys = new Set(schemaKeyList);
    const active = new Set(activeKeys);
    const unknownFromPersisted = collectPersistedUnknownKeys(persisted, schemaKeys);
    const candidates = new Set<string>([...schemaKeyList, ...unknownFromPersisted]);
    const options: AvailableKeyOption[] = [];
    candidates.forEach((key) => {
        if (active.has(key)) {
            return;
        }
        const entry = KNOWN_SETTINGS_SCHEMA[key];
        if (entry) {
            options.push({ value: key, labelKey: entry.labelKey, isUnknownKey: false });
        } else {
            options.push({ value: key, isUnknownKey: true });
        }
    });
    return options.sort((a, b) => a.value.localeCompare(b.value));
}
