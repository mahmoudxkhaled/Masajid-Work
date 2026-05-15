import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, finalize, tap } from 'rxjs';
import { ApiService } from 'src/app/core/api/api.service';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';

export type SettingsLayerType =
    | 'system'
    | 'defaultAccount'
    | 'account'
    | 'defaultEntity'
    | 'entity';

export const SETTINGS_ERROR_CODES = {
    EMPTY_KEY: 'ERP11420',
    EMPTY_VALUE: 'ERP11421',
    NOT_FOUND: 'ERP11422',
    INVALID_ACCOUNT_ID: 'ERP11425',
    INVALID_ENTITY_ID: 'ERP11426',
} as const;

@Injectable({
    providedIn: 'root',
})
export class SettingsApiService {
    isLoadingSubject = new BehaviorSubject<boolean>(false);

    constructor(
        private apiServices: ApiService,
        private localStorageService: LocalStorageService
    ) { }

    private getAccessToken(): string {
        return this.localStorageService.getAccessToken();
    }

    private executeSettingsRequest(requestCode: number, params: string[]): Observable<any> {
        this.isLoadingSubject.next(true);
        console.log('[settings-api] request', { requestCode, params });
        return this.apiServices.callAPI(requestCode, this.getAccessToken(), params).pipe(
            tap((response: any) => console.log('[settings-api] response', { requestCode, response })),
            finalize(() => this.isLoadingSubject.next(false))
        );
    }

    private serializeSettings(settingsList: Record<string, string>): string {
        const keys = Object.keys(settingsList || {}).sort((a, b) => a.localeCompare(b));
        const list = keys.map((key) => ({ [key]: settingsList[key] ?? '' }));
        return JSON.stringify(list);
    }

    /**
     * Set ERP System Settings
     * API Code: 730
     */
    setERPSystemSettings(settingsList: Record<string, string>): Observable<any> {
        return this.executeSettingsRequest(730, [this.serializeSettings(settingsList)]);
    }

    /**
     * Get ERP System Settings
     * API Code: 731
     */
    getERPSystemSettings(): Observable<any> {
        return this.executeSettingsRequest(731, []);
    }

    /**
     * Remove ERP System Setting
     * API Code: 732
     */
    removeERPSystemSetting(settingName: string): Observable<any> {
        return this.executeSettingsRequest(732, [settingName]);
    }

    /**
     * Set Default Account Settings
     * API Code: 760
     */
    setDefaultAccountSettings(settingsList: Record<string, string>): Observable<any> {
        return this.executeSettingsRequest(760, [this.serializeSettings(settingsList)]);
    }

    /**
     * Get Default Account Settings
     * API Code: 761
     */
    getDefaultAccountSettings(): Observable<any> {
        console.log('[settings-api] Get_Default_Account_Settings (761)');
        return this.executeSettingsRequest(761, []).pipe(
            tap((response: any) =>
                console.log('[settings-api] Get_Default_Account_Settings — response:', response)
            )
        );
    }

    /**
     * Set Account Settings
     * API Code: 762
     */
    setAccountSettings(accountId: number, settingsList: Record<string, string>): Observable<any> {
        return this.executeSettingsRequest(762, [accountId.toString(), this.serializeSettings(settingsList)]);
    }

    /**
     * Get Account Settings
     * API Code: 763
     */
    getAccountSettings(accountId: number): Observable<any> {
        console.log('[settings-api] Get_Account_Settings — accountId:', accountId);
        return this.apiServices.callAPI(763, this.getAccessToken(), [accountId.toString()]).pipe(
            finalize(() => this.isLoadingSubject.next(false)),
            tap((response: any) => console.log('[settings-api] Get_Account_Settings — response:', response))
        );
    }

    /**
     * Remove Account Setting
     * API Code: 764
     */
    removeAccountSetting(accountId: number, settingName: string): Observable<any> {
        return this.executeSettingsRequest(764, [accountId.toString(), settingName]);
    }

    /**
     * Set Default Entity Settings
     * API Code: 780
     */
    setDefaultEntitySettings(settingsList: Record<string, string>): Observable<any> {
        return this.executeSettingsRequest(780, [this.serializeSettings(settingsList)]);
    }

    /**
     * Get Default Entity Settings
     * API Code: 781
     */
    getDefaultEntitySettings(): Observable<any> {
        console.log('[settings-api] Get_Default_Entity_Settings (781)');
        return this.executeSettingsRequest(781, []).pipe(
            tap((response: any) =>
                console.log('[settings-api] Get_Default_Entity_Settings — response:', response)
            )
        );
    }

    /**
     * Set Entity Settings
     * API Code: 782
     */
    setEntitySettings(entityId: number, settingsList: Record<string, string>): Observable<any> {
        return this.executeSettingsRequest(782, [entityId.toString(), this.serializeSettings(settingsList)]);
    }

    /**
     * Get Entity Settings
     * API Code: 783
     */
    getEntitySettings(entityId: number): Observable<any> {
        console.log('[settings-api] Get_Entity_Settings — entityId:', entityId);
        return this.apiServices.callAPI(783, this.getAccessToken(), [entityId.toString()]).pipe(
            finalize(() => this.isLoadingSubject.next(false)),
            tap((response: any) => console.log('[settings-api] Get_Entity_Settings — response:', response))
        );
    }

    /**
     * Remove Entity Setting
     * API Code: 784
     */
    removeEntitySetting(entityId: number, settingName: string): Observable<any> {
        return this.executeSettingsRequest(784, [entityId.toString(), settingName]);
    }
}
