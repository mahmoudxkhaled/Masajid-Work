import { Component, OnInit } from '@angular/core';
import { PermissionService } from 'src/app/core/services/permission.service';
import { Roles } from 'src/app/core/models/system-roles';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';
import { SettingsApiService } from '../../../services/settings-api.service';

@Component({
    selector: 'app-account-settings-tab',
    templateUrl: './account-settings-tab.component.html',
    styleUrls: ['./account-settings-tab.component.scss'],
})
export class AccountSettingsTabComponent implements OnInit {
    canManageDefault = false;
    defaultAccountData: Record<string, string> | null = null;
    accountCustomData: Record<string, string> | null = null;
    accountSettingsReady = false;
    loading = false;

    constructor(
        private permissionService: PermissionService,
        private settingsApiService: SettingsApiService,
        private localStorageService: LocalStorageService
    ) {}

    ngOnInit(): void {
        this.canManageDefault = this.permissionService.hasAnyRole([
            Roles.Developer,
            Roles.SystemAdministrator,
        ]);
        this.loadAccountTab();
    }

    reloadAccountTab(): void {
        this.loadAccountTab();
    }

    private loadAccountTab(): void {
        const accountId = Number(this.localStorageService.getAccountDetails()?.Account_ID || 0);
        if (!accountId) {
            this.defaultAccountData = {};
            this.accountCustomData = {};
            this.accountSettingsReady = true;
            return;
        }

        this.loading = true;
        this.settingsApiService.getAccountSettings(accountId).subscribe({
            next: (response: any) => {
                this.loading = false;
                console.log('[settings] Get_Account_Settings (763) response:', response);
                if (response?.success && response?.message) {
                    const msg = response.message;
                    this.defaultAccountData = { ...(msg.Default_Account_Settings ?? msg.default_Account_Settings ?? {}) };
                    this.accountCustomData = { ...(msg.Account_Settings ?? msg.account_Settings ?? {}) };
                } else {
                    this.defaultAccountData = {};
                    this.accountCustomData = {};
                }
                this.accountSettingsReady = true;
            },
            error: () => {
                this.loading = false;
                this.defaultAccountData = {};
                this.accountCustomData = {};
                this.accountSettingsReady = true;
            },
        });
    }
}
