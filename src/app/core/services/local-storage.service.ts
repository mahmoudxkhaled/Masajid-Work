import { Injectable } from '@angular/core';
import { APP_DEFAULT_LANGUAGE } from '../config/app-branding.config';
import { IUserDetails, IAccountDetails, IEntityDetails, IAccountSettings, IAccountStatusResponse, IUserAccountItem } from '../models/account-status.model';
import { MasajidUserType } from '../models/masajid-user-type.model';

@Injectable({
  providedIn: 'root'
})
export class LocalStorageService {

  constructor() { }

  clearAll(): void {
    localStorage.clear();
  }

  // #region Token
  getToken(): string | null {
    return localStorage.getItem('token');
  }

  setToken(token: string): void {
    localStorage.setItem('token', token);
  }

  clearToken(): void {
    localStorage.removeItem('token');
  }

  getAccessToken(): string {
    return this.getToken() || '';
  }
  // #endregion

  // #region Language & Theme preferences (source of truth: Account_Settings)
  getPreferredLanguageCode(): 'en' | 'ar' {
    const lang = (this.getAccountSettings()?.Language || '').toString().trim().toLowerCase();
    if (lang === 'en' || lang === 'english') {
      return 'en';
    }
    if (lang === 'ar' || lang === 'arabic' || lang === 'العربية') {
      return 'ar';
    }
    return APP_DEFAULT_LANGUAGE;
  }

  setPreferredLanguageCode(code: 'en' | 'ar'): void {
    const settings = this.getAccountSettings() || ({} as IAccountSettings);
    settings.Language = code === 'ar' ? 'Arabic' : 'English';
    this.setItem('Account_Settings', settings);
  }

  getPreferredTheme(): 'light' | 'dark' {
    const theme = (this.getAccountSettings()?.Theme || '').toString().trim().toLowerCase();
    return theme === 'dark' ? 'dark' : 'light';
  }

  setPreferredTheme(theme: 'light' | 'dark'): void {
    const settings = this.getAccountSettings() || ({} as IAccountSettings);
    settings.Theme = theme;
    this.setItem('Account_Settings', settings);
  }
  // #endregion

  // #region Generic storage
  setItem(key: string, data: any) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  removeItem(key: string) {
    localStorage.removeItem(key);
  }

  getItem(key: string) {
    const data = localStorage.getItem(key);
    if (data !== null && data !== 'undefined') {
      return JSON.parse(data);
    }
    return null;
  }
  // #endregion

  // #region Domain getters
  getEntityId() {
    return this.getEntityDetails()?.Entity_ID ?? '';
  }

  getParentEntityId() {
    return this.getEntityDetails()?.Parent_Entity_ID ?? '';
  }

  get2FaStatus() {
    return this.getAccountDetails()?.Two_FA ?? false;
  }

  getGender() {
    return this.getUserDetails()?.Gender ?? false;
  }

  getUserDetails(): IUserDetails | null {
    return this.getItem('User_Details');
  }

  getAccountDetails(): IAccountDetails | null {
    return this.getItem('Account_Details');
  }

  getEntityDetails(): IEntityDetails | null {
    return this.getItem('Entity_Details');
  }

  getAccountSettings(): IAccountSettings | null {
    return this.getItem('Account_Settings');
  }

  mergeAccountSettings(partial: Partial<IAccountSettings>): void {
    const current = this.getAccountSettings() || ({} as IAccountSettings);
    this.setItem('Account_Settings', { ...current, ...partial });
  }

  getUserAccounts(): IUserAccountItem[] | null {
    return this.getItem('User_Accounts');
  }

  getUserPreferences(): Record<string, string> | null {
    const raw = localStorage.getItem('User_Preferences');
    if (!raw || raw === 'undefined') {
      return null;
    }
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, string>;
      }
      if (typeof parsed === 'string') {
        return { layoutConfig: parsed };
      }
      return null;
    } catch {
      // When stored as plain string (not JSON), treat as layoutConfig
      return { layoutConfig: raw };
    }
  }
  // #endregion

  // #region Masajid user context
  setMasajidUserType(userType: MasajidUserType): void {
    this.setItem('Masajid_User_Type', userType);
  }

  getMasajidUserType(): MasajidUserType | null {
    return this.getItem('Masajid_User_Type') as MasajidUserType | null;
  }

  setEntityTypeId(entityTypeId: number): void {
    this.setItem('Entity_Type_ID', entityTypeId);
  }

  getEntityTypeId(): number | null {
    const value = this.getItem('Entity_Type_ID');
    if (value === null || value === undefined) {
      return null;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  clearMasajidUserContext(): void {
    this.removeItem('Masajid_User_Type');
    this.removeItem('Entity_Type_ID');
  }
  // #endregion

  // #region Login lifecycle
  setLoginDataPackage(accountData: IAccountStatusResponse): void {
    this.clearMasajidUserContext();
    if (accountData.User_Details) {
      this.setItem('User_Details', accountData.User_Details);
    }

    if (accountData.Account_Details) {
      this.setItem('Account_Details', accountData.Account_Details);
    }

    if (accountData.Entity_Details) {
      this.setItem('Entity_Details', accountData.Entity_Details);
    }

    if (accountData.Account_Settings) {
      const existingSettings = this.getAccountSettings();
      const settingsToSave = { ...accountData.Account_Settings };
      if (existingSettings?.Language) {
        settingsToSave.Language = existingSettings.Language;
      }
      if (existingSettings?.Theme) {
        settingsToSave.Theme = existingSettings.Theme;
      }
      this.setItem('Account_Settings', settingsToSave);
    }

    if (accountData.User_Accounts) {
      this.setItem('User_Accounts', accountData.User_Accounts);
    }
  }

  clearLoginDataPackage(): void {
    this.clearAll();
  }
  // #endregion
}
