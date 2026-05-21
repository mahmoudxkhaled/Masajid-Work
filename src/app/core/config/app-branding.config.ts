export type AppLanguageCode = 'en' | 'ar';

export interface AppBranding {
    platformName: string;
    technicalName: string;
    displayName: string;
}

export const APP_DEFAULT_LANGUAGE: AppLanguageCode = 'ar';

export const APP_BRANDING: AppBranding = {
    platformName: 'Masajid Work',
    technicalName: 'DAP',
    displayName: 'Masajid Work',
};
