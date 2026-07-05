import { Component, OnDestroy, OnInit } from '@angular/core';
import { DialogService } from 'primeng/dynamicdialog';
import { Subscription } from 'rxjs';
import { LogoutComponent } from 'src/app/modules/auth/components/logout/logout.component';
import { IMenuFunction, IMenuModule } from '../../core/models/account-status.model';
import { DashboardResolverService } from '../../core/services/dashboard-resolver.service';
import { LanguageDirService } from '../../core/services/language-dir.service';
import { ModuleNavigationService } from '../../core/services/module-navigation.service';
import { TranslationService } from '../../core/services/translation.service';

@Component({
    selector: 'app-menu',
    templateUrl: './app.menu.component.html',
})
export class AppMenuComponent implements OnInit, OnDestroy {
    model: any[] = [];
    currentPages: any;
    showLogoutDialog: boolean = false;
    private menuSub?: Subscription;
    private langSub?: Subscription;
    private buildGeneration = 0;

    constructor(
        private translate: TranslationService,
        private dialogService: DialogService,
        private moduleNavigationService: ModuleNavigationService,
        private dashboardResolverService: DashboardResolverService,
        private languageDirService: LanguageDirService,
    ) {
    }

    ngOnInit(): void {
        this.buildMenu();
        this.langSub = new Subscription();
        this.langSub.add(
            this.languageDirService.userLanguageCode$.subscribe(() => {
                this.onLangChange();
            })
        );
        this.langSub.add(
            this.translate.getCurrentLang().subscribe(() => {
                this.onLangChange();
            })
        );
    }

    onLangChange(): void {
        this.buildMenu();
    }

    buildMenu(): void {
        const generation = ++this.buildGeneration;
        this.menuSub?.unsubscribe();
        this.menuSub = this.dashboardResolverService.resolveCurrentUserType().subscribe((userType) => {
            if (generation !== this.buildGeneration) {
                return;
            }

            const functions = this.moduleNavigationService
                .getFunctionsWithModules(userType)
                .filter((func) => Array.isArray(func.modules) && func.modules.length > 0);

            const functionItems = functions.map((func) => ({
                label: this.getDisplayName(func),
                hasPermession: true,
                icon: func.icon || this.getDefaultFunctionIcon(func.code),
                items: func.modules.map((module) => {
                    if (module.code === 'LGOT') {
                        return {
                            label: this.getDisplayName(module),
                            hasPermession: true,
                            icon: module.icon || 'fa fa-sign-out-alt',
                            command: () => this.logOut(),
                        };
                    }

                    return {
                        label: this.getDisplayName(module),
                        hasPermession: true,
                        icon: module.icon || this.getDefaultModuleIcon(module.code),
                        routerLink: module.isImplemented && module.url ? [module.url] : null,
                        disabled: !module.isImplemented || !module.url,
                    };
                }),
            }));

            this.model = [
                {
                    label: this.translate.getInstant('layout.menu.home'),
                    hasPermession: true,
                    icon: 'fa fa-home',
                    routerLink: ['/dashboard'],
                },
                ...functionItems,
            ];
        });
    }

    private getDisplayName(item: IMenuFunction | IMenuModule): string {
        return item.name || '';
    }

    private getDefaultFunctionIcon(functionCode: string): string {
        const iconMap: Record<string, string> = {
            DBS: 'fa fa-chart-pie',
            EntAdm: 'fa fa-building',
            DC: 'fa fa-file-alt',
            SysAdm: 'fa fa-cog',
            MSA: 'fa fa-user-shield',
            MSF: 'fa fa-mosque',
            MSD: 'fa fa-heart',
            MSV: 'fa fa-store',
            MSC: 'fa fa-university',
        };
        return iconMap[functionCode] || 'fa fa-folder';
    }

    private getDefaultModuleIcon(moduleCode: string): string {
        const iconMap: Record<string, string> = {
            NOT: 'fa fa-bell',
            NOTM: 'fa fa-sliders-h',
            PRF: 'fa fa-user',
            SET: 'fa fa-cog',
            LGOT: 'fa fa-sign-out-alt',
            SDB: 'fa fa-chart-line',
            SSM: 'fa fa-hdd',
            SENT: 'fa fa-sitemap',
            USRACC: 'fa fa-users-cog',
            EUA: 'fa fa-users',
            ENTDT: 'fa fa-building',
            GP: 'fa fa-users',
            STCM: 'fa fa-folder-open',
            FDRQ: 'fa fa-list',
            FDRQ_NEW: 'fa fa-plus-circle',
            FCONF: 'fa fa-box',
            FAC_PROFILE: 'fa fa-user',
            FAC_NOT: 'fa fa-bell',
            DNBR: 'fa fa-search',
            DNCMT: 'fa fa-handshake',
            DNVAL: 'fa fa-shield-alt',
            DNR_PROFILE: 'fa fa-user',
            DNR_NOT: 'fa fa-bell',
            ADM_REV: 'fa fa-check-circle',
            ADM_OVER: 'fa fa-clock',
            ADM_FAC: 'fa fa-building',
            ADM_ACC: 'fa fa-users-cog',
            ADM_NOT: 'fa fa-sliders-h',
            VREQ: 'fa fa-store',
            VOFR: 'fa fa-file-alt',
            VOFR_NEW: 'fa fa-plus',
            VND_PROFILE: 'fa fa-user',
            VND_NOT: 'fa fa-bell',
            CHR_REQ: 'fa fa-university',
            CHR_CMT: 'fa fa-handshake',
            CHR_SUPPORT: 'fa fa-life-ring',
            CHR_PROFILE: 'fa fa-user',
            CHR_NOT: 'fa fa-bell',
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

    ngOnDestroy(): void {
        this.menuSub?.unsubscribe();
        this.langSub?.unsubscribe();
    }
}
