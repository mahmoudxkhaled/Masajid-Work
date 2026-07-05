import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Chart } from 'chart.js';
import { PrimeNGConfig } from 'primeng/api';
import { Subscription } from 'rxjs';
import { catchError, filter, switchMap } from 'rxjs/operators';
import { LanguageDirService } from './core/services/language-dir.service';
import { LocalStorageService } from './core/services/local-storage.service';
import { NetworkStatusService } from './core/services/network-status.service';
import { NotificationRefreshService } from './core/services/notification-refresh.service';
import { TranslationService } from './core/services/translation.service';
import { LayoutService } from './layout/app-services/app.layout.service';
import { AuthService } from './modules/auth/services/auth.service';
import { SettingsEngineService } from './modules/summary/services/settings-engine.service';
import { APP_DEFAULT_LANGUAGE } from './core/config/app-branding.config';
import { BrandingService } from './core/services/branding.service';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
})
export class AppComponent implements OnInit, OnDestroy {
    constructor(
        private primengConfig: PrimeNGConfig,
        private localStorage: LocalStorageService,
        private translationService: TranslationService,
        private rtlService: LanguageDirService,
        private layoutService: LayoutService,
        private ref: ChangeDetectorRef,
        private networkStatusService: NetworkStatusService,
        private translate: TranslationService,
        private authService: AuthService,
        private notificationRefreshService: NotificationRefreshService,
        private router: Router,
        private settingsEngineService: SettingsEngineService,
        private brandingService: BrandingService
    ) {
        this.translationService.setDefaultLang(APP_DEFAULT_LANGUAGE);
        const documentStyle = getComputedStyle(document.documentElement);
        const textColor = documentStyle.getPropertyValue('--primary-color');
        Chart.register({
            id: 'noDataPlugin',
            beforeDraw: (chart: any) => {
                const ctx = chart.ctx;
                const datasets = chart.data.datasets;
                const noData = datasets.every((dataset: any) => dataset.data.length === 0);

                if (noData) {
                    const width = chart.width;
                    const height = chart.height;
                    ctx.save();
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.font = '16px sans-serif';
                    ctx.fillStyle = textColor;
                    ctx.fillText(this.translate.getInstant('shared.messages.noDataAvailable'), width / 2, height / 2);
                    ctx.restore();
                }
            },
        });
    }

    private rtlSubscription: Subscription;
    private languageSubscription: Subscription;
    private routerSubscription: Subscription;
    private runtimeLanguageActive = false;

    isRtl = false;
    userLanguageCode: string | null = null;

    ngOnInit(): void {
        document.title = this.brandingService.displayName;

        this.primengConfig.ripple = true;

        const isAuthenticated = !!this.localStorage.getAccessToken();

        this.rtlSubscription = this.rtlService.isRtl$.subscribe((isRtl) => {
            this.isRtl = isRtl;
            this.ref.detectChanges();
        });
        this.languageSubscription = this.rtlService.userLanguageCode$.subscribe((lang) => {
            if (!this.runtimeLanguageActive) {
                return;
            }
            this.translationService.useLanguage(lang).subscribe(() => this.ref.detectChanges());
        });

        if (!isAuthenticated) {
            const userLangCode = this.rtlService.getPublicLanguageCode();
            this.rtlService.setGuestLanguageCode(userLangCode);
            this.translationService.useLanguage(userLangCode || APP_DEFAULT_LANGUAGE).subscribe({
                next: () => {
                    this.runtimeLanguageActive = true;
                    if (!this.isPublicGuestBootstrapRoute()) {
                        this.translationService.hideBootstrapPreloaderWhenStable();
                    }
                },
                error: () => {
                    this.runtimeLanguageActive = true;
                    this.translationService.hideBootstrapPreloaderWhenStable();
                },
            });
        } else {
            this.bootstrapAuthenticatedApp();
        }

        this.routerSubscription = this.router.events
            .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
            .subscribe(() => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
    }

    private bootstrapAuthenticatedApp(): void {
        const email = this.localStorage.getAccountDetails()?.Email;

        const settingsReady$ = email
            ? this.authService.getLoginDataPackage(email).pipe(
                switchMap(() => this.settingsEngineService.loadAllLayers(true, { applyShell: false })),
                catchError(() => this.settingsEngineService.loadAllLayers(false, { applyShell: false }))
            )
            : this.settingsEngineService.loadAllLayers(false, { applyShell: false });

        settingsReady$.subscribe({
            next: () => {
                this.settingsEngineService.applyRuntimeShell().subscribe({
                    next: () => {
                        this.runtimeLanguageActive = true;
                        this.translationService.hideBootstrapPreloaderWhenStable();
                    },
                    error: () => {
                        this.runtimeLanguageActive = true;
                        this.translationService.hideBootstrapPreloaderWhenStable();
                    },
                });
            },
            error: () => {
                this.settingsEngineService.applyRuntimeShell().subscribe({
                    next: () => {
                        this.runtimeLanguageActive = true;
                        this.translationService.hideBootstrapPreloaderWhenStable();
                    },
                    error: () => {
                        this.runtimeLanguageActive = true;
                        this.translationService.hideBootstrapPreloaderWhenStable();
                    },
                });
            },
        });

        this.notificationRefreshService.requestRefresh();
    }

    toggleDirection() {
        this.isRtl = !this.isRtl;
        this.rtlService.setRtl(this.isRtl);
        this.translationService.useLanguage(this.isRtl ? 'ar' : 'en');
    }

    private isPublicGuestBootstrapRoute(): boolean {
        if (this.localStorage.getAccessToken()) {
            return false;
        }
        const path = typeof window !== 'undefined' ? window.location.pathname : '';
        return path === '' || path === '/' || path.startsWith('/register');
    }

    ngOnDestroy(): void {
        this.rtlSubscription.unsubscribe();
        this.languageSubscription.unsubscribe();
        this.routerSubscription?.unsubscribe();
    }
}
