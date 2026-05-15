export function resolveSetting(
    key: string,
    accountSettings: Record<string, string>,
    defaultAccountSettings: Record<string, string>,
    entitySettings: Record<string, string>,
    defaultEntitySettings: Record<string, string>,
    systemSettings: Record<string, string>
): string | null {
    return (
        accountSettings[key] ??
        defaultAccountSettings[key] ??
        entitySettings[key] ??
        defaultEntitySettings[key] ??
        systemSettings[key] ??
        null
    );
}
