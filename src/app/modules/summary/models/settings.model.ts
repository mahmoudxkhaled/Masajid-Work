export interface UserSettings {
    language: string;
    theme: 'light' | 'dark';
    timezone: string;
    emailNotifications: boolean;
    pushNotifications: boolean;
    smsNotifications: boolean;
    twoFactorAuth: boolean;
    sessionTimeout: string;
    autoLogout: boolean;
    profileVisibility: boolean;
    analyticsTracking: boolean;
    dataRetention: string;
}

