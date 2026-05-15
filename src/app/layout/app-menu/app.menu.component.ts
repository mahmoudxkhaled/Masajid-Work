import { Component, OnInit } from '@angular/core';
import { DialogService } from 'primeng/dynamicdialog';
import { LogoutComponent } from 'src/app/modules/auth/components/logout/logout.component';
import { IMenuFunction, IMenuModule } from '../../core/models/account-status.model';
import { ModuleNavigationService } from '../../core/services/module-navigation.service';
import { TranslationService } from '../../core/services/translation.service';

@Component({
    selector: 'app-menu',
    templateUrl: './app.menu.component.html',
})
export class AppMenuComponent implements OnInit {
    model: any[] = [];
    currentPages: any;
    showLogoutDialog: boolean = false;

    constructor(
        private translate: TranslationService,
        private dialogService: DialogService,
        private moduleNavigationService: ModuleNavigationService
    ) {
    }

    ngOnInit(): void {
        this.buildMenu();
        this.translate.getCurrentLang().subscribe(() => {
            this.onLangChange();
        });
    }

    onLangChange(): void {
        this.buildMenu();
    }

    buildMenu(): void {
        const functions = this.moduleNavigationService
            .getFunctionsWithModules()
            .filter(func => Array.isArray(func.modules) && func.modules.length > 0);

        const functionItems = functions.map(func => ({
            label: this.getDisplayName(func),
            hasPermession: true,
            icon: func.icon || this.getDefaultFunctionIcon(func.code),
            items: func.modules.map(module => {
                if (module.code === 'LGOT') {
                    return {
                        label: this.getDisplayName(module),
                        hasPermession: true,
                        icon: module.icon || 'fa fa-sign-out-alt',
                        command: () => this.logOut()
                    };
                }

                return {
                    label: this.getDisplayName(module),
                    hasPermession: true,
                    icon: module.icon || this.getDefaultModuleIcon(module.code),
                    routerLink: module.isImplemented && module.url ? [module.url] : null,
                    disabled: !module.isImplemented || !module.url
                };
            })
        }));

        // Add a Home entry at the top that always navigates to the main dashboard/home
        this.model = [
            {
                label: this.translate.getInstant('layout.menu.home'),
                hasPermession: true,
                icon: 'fa fa-home',
                routerLink: ['/']
            },
            ...functionItems
        ];
    }


    private getDisplayName(item: IMenuFunction | IMenuModule): string {
        // Use name (already filtered by regional in service)
        return item.name || '';
    }


    private getDefaultFunctionIcon(functionCode: string): string {
        const iconMap: Record<string, string> = {
            'DBS': 'fa fa-chart-pie',
            'SysAdm': 'fa fa-cog',
            'EntAdm': 'fa fa-building',
            'DC': 'fa fa-file-alt',
            'FIN': 'fa fa-receipt',
            'HR': 'fa fa-user-tie',
            'CRM': 'fa fa-handshake',
            'SCM': 'fa fa-truck',
            'PC': 'fa fa-project-diagram'
        };
        return iconMap[functionCode] || 'fa fa-folder';
    }


    private getDefaultModuleIcon(moduleCode: string): string {
        const iconMap: Record<string, string> = {
            'ACT': 'fa fa-bolt',
            'NOT': 'fa fa-bell',
            'PRF': 'fa fa-user',
            'SET': 'fa fa-cog',
            'LGOT': 'fa fa-sign-out-alt',
            'SDB': 'fa fa-chart-line',
            'ERPF': 'fa fa-puzzle-piece',
            'ERPM': 'fa fa-cubes',
            'ENTDT': 'fa fa-building',
            'USRACC': 'fa fa-users',
            'WF': 'fa fa-sync-alt',
            'TS': 'fa fa-clock',
            'FCOA': 'fa fa-book'
        };
        return iconMap[moduleCode] || 'fa fa-file';
    }

    hassPermession(pageName: string): boolean {
        return true;
    }


    logOut() {
        this.dialogService.open(LogoutComponent, {
            showHeader: true,
            header: this.translate.getInstant('shared.headers.confirmLogout'),
            styleClass: 'custom-dialog',
            maskStyleClass: 'custom-backdrop',
            dismissableMask: true,
            width: '30vw',
            closable: true,
        });
    }
}
