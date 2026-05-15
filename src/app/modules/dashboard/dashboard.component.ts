import { ChangeDetectorRef, Component, OnDestroy, OnInit, AfterViewInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Subscription } from 'rxjs';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';
import { LanguageDirService } from 'src/app/core/services/language-dir.service';
import { TranslationService } from 'src/app/core/services/translation.service';
import { AuthService } from '../auth/services/auth.service';
import { LogoutComponent } from '../auth/components/logout/logout.component';
import { DialogService } from 'primeng/dynamicdialog';
import { SettingsConfigurationsService } from 'src/app/modules/system-administration/settings-configurations.service';
import { IMenuFunction, IMenuModule } from 'src/app/core/models/account-status.model';
import { ModuleNavigationService } from 'src/app/core/services/module-navigation.service';

@Component({
    selector: 'app-dashboard',
    templateUrl: './dashboard.component.html',
    styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, AfterViewInit, OnDestroy {
    currentUser: any = null;
    userRole: string = '';
    userName: string = '';
    showLogoutDialog: boolean = false;
    dashboardCategories: IMenuFunction[] = [];
    highlightedModuleCode: string | null = null;
    private readonly moduleLogoLoadingCodes = new Set<string>();
    private langSub: Subscription;

    constructor(
        private localStorageService: LocalStorageService,
        private languageDirService: LanguageDirService,
        private router: Router,
        private route: ActivatedRoute,
        public translate: TranslationService,
        private messageService: MessageService,
        private dialogService: DialogService,
        private authService: AuthService,
        private moduleNavigationService: ModuleNavigationService,
        private settingsConfigurationsService: SettingsConfigurationsService,
        private cdr: ChangeDetectorRef
    ) { }

    ngOnInit(): void {
        this.loadUserData();
        this.loadDashboardCategories();

        this.langSub = this.languageDirService.userLanguageCode$.subscribe(() => {
            this.loadDashboardCategories();
            this.cdr.detectChanges();
        });

        this.route.queryParams.subscribe(params => {
            if (params['moduleUrl']) {
                setTimeout(() => {
                    this.scrollToModule(params['moduleUrl']);
                }, 100);
            }
        });
    }

    ngAfterViewInit(): void {
        const moduleUrl = this.route.snapshot.queryParams['moduleUrl'];
        if (moduleUrl) {
            setTimeout(() => {
                this.scrollToModule(moduleUrl);
            }, 200);
        }
    }

    loadUserData(): void {
        const userDetails = this.localStorageService.getUserDetails();
        if (userDetails) {
            this.userName = `${userDetails.First_Name || ''} ${userDetails.Last_Name || ''}`.trim();
        }
    }

    getRoleDisplayName(role: string): string {
        return role.replace('-', ' ').toUpperCase();
    }

    loadDashboardCategories(): void {
        this.dashboardCategories = this.moduleNavigationService
            .getFunctionsWithModules()
            .filter(func => Array.isArray(func.modules) && func.modules.length > 0);
        this.loadModuleLogos();
    }

    private loadModuleLogos(): void {
        this.moduleLogoLoadingCodes.clear();
        this.dashboardCategories.forEach((func) => {
            func.modules.forEach((module) => {
                this.moduleLogoLoadingCodes.add(module.code);
                this.settingsConfigurationsService.getModuleLogoCached(module.moduleId).subscribe((url) => {
                    this.moduleLogoLoadingCodes.delete(module.code);
                    if (url) {
                        module.icon = url;
                    } else {
                        delete module.icon;
                    }
                    this.cdr.detectChanges();
                });
            });
        });
    }

    isModuleLogoLoading(module: IMenuModule): boolean {
        return this.moduleLogoLoadingCodes.has(module.code);
    }

    getDashboardCategories(): IMenuFunction[] {
        return this.dashboardCategories;
    }

    /**
     * Get default icon for module (fallback when logo not available)
     */
    getModuleIcon(module: IMenuModule): string {
        if (module.icon) {
            return module.icon;
        }
        return this.getDefaultModuleIcon(module.code);
    }

    /**
     * Get default icon for module based on code
     */
    private getDefaultModuleIcon(moduleCode: string): string {
        const iconMap: Record<string, string> = {
            'ACT': '⚡',
            'NOT': '🔔',
            'PRF': '👤',
            'SET': '⚙️',
            'LGOT': '🚪',
            'SDB': '📊',
            'ERPF': '🧩',
            'ERPM': '📦',
            'ENTDT': '🏢',
            'USRACC': '👥',
            'WF': '🔄',
            'EACC': '💼',
            'SHDOC': '📄',
            'FCOA': '📚',
            'AP': '💰',
            'AR': '💵',
            'GL': '📖',
            'OC': '🏛️',
            'PRSN': '👔',
            'TS': '⏰',
            'CLNT': '🤝',
            'EST': '📊',
            'TND': '📋',
            'MC': '📝',
            'CINV': '🧾',
            'VND': '🚚',
            'PO': '🛒',
            'SC': '📄',
            'VINV': '🧾',
            'WBS': '📐',
            'CBS': '📊',
            'QS': '📏',
            'BUDG': '💵',
            'CRPT': '📈',
            'PRPT': '📊',
            'SCP': '🎛️',
            'SU': '🧑‍💻',
            'GP': '👥',
            'NOTM': '🛎️',
            'SSM': '💾',
            'ESM': '🗃️',
            'SCM': '📂',
            'SDBV2': '📊',
            'SENT': '🗂️',
            'EUA': '👥'
        };
        return iconMap[moduleCode] || '📁';
    }

    /**
     * Handle module click - navigate to module route
     */
    onModuleClick(module: IMenuModule): void {
        if (module.code === 'LGOT') {
            this.logOut();
            return;
        }

        if (module.url && module.isImplemented) {
            this.router.navigateByUrl(module.url);
        }
    }

    onLogoutConfirm() {
        this.authService.logout().subscribe({
            next: (r: any) => {
                if (r?.success) {
                    this.router.navigate(['/auth']);
                    return;
                }
                this.handleBusinessError('logout', r);
            },
            error: () => {
                this.messageService.add({
                    severity: 'error',
                    summary: this.translate.getInstant('common.error'),
                    detail: this.translate.getInstant('dashboardScreen.logout.errors.network'),
                });
            },
        });
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

    /**
     * Find module by URL in dashboard categories
     */
    findModuleByUrl(url: string): IMenuModule | null {
        for (const category of this.dashboardCategories) {
            for (const module of category.modules) {
                if (module.url === url) {
                    return module;
                }
                if (module.url && url) {
                    const normalizedModuleUrl = module.url.trim().replace(/^\/+|\/+$/g, '');
                    const normalizedUrl = url.trim().replace(/^\/+|\/+$/g, '');
                    if (normalizedModuleUrl === normalizedUrl ||
                        normalizedModuleUrl.startsWith(normalizedUrl + '/') ||
                        normalizedUrl.startsWith(normalizedModuleUrl + '/')) {
                        return module;
                    }
                }
            }
        }
        return null;
    }

    /**
     * Scroll to module card and highlight it
     */
    scrollToModule(moduleUrl: string): void {
        const module = this.findModuleByUrl(moduleUrl);
        if (!module) {
            return;
        }

        const moduleElement = document.getElementById(`module-card-${module.code}`);
        if (moduleElement) {
            const offset = 100;
            const elementPosition = moduleElement.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - offset;

            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            });

            this.highlightedModuleCode = module.code;

            setTimeout(() => {
                this.highlightedModuleCode = null;
            }, 3000);

            this.router.navigate([], {
                relativeTo: this.route,
                queryParams: {},
                replaceUrl: true
            });
        }
    }

    /**
     * Check if module is currently highlighted
     */
    isModuleHighlighted(moduleCode: string): boolean {
        return this.highlightedModuleCode === moduleCode;
    }

    // #region Business errors

    private handleBusinessError(context: 'logout', response: any): void {
        const code = String(response?.message || '');
        let detail = '';

        switch (context) {
            case 'logout':
                detail = this.getLogoutErrorMessage(code) || '';
                break;
            default:
                detail = '';
        }

        if (detail) {
            this.messageService.add({
                severity: 'error',
                summary: this.translate.getInstant('common.error'),
                detail,
            });
        }
    }

    private getLogoutErrorMessage(code: string): string | null {
        switch (code) {
            default:
                return null;
        }
    }

    // #endregion

    ngOnDestroy(): void {
        this.langSub?.unsubscribe();
    }
}