import { Injectable, Injector } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, finalize, of, switchMap, tap, catchError, map } from 'rxjs';
import { ApiService } from 'src/app/core/api/api.service';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';
import { NotificationRefreshService } from 'src/app/core/services/notification-refresh.service';
import { IAccountStatusResponse } from 'src/app/core/models/account-status.model';
import { SettingsEngineService } from '../../summary/services/settings-engine.service';
import { ProfileApiService } from 'src/app/modules/summary/services/profile-api.service';
import { LayoutService } from 'src/app/layout/app-services/app.layout.service';
import { DashboardResolverService } from 'src/app/core/services/dashboard-resolver.service';

@Injectable({
    providedIn: 'root',
})
export class AuthService {
    isLoadingSubject = new BehaviorSubject<boolean>(false);
    constructor(
        private apiServices: ApiService,
        private localStorageService: LocalStorageService,
        private router: Router,
        private notificationRefreshService: NotificationRefreshService,
        private injector: Injector,
        private profileApiService: ProfileApiService,
        private layoutService: LayoutService,
        private dashboardResolverService: DashboardResolverService
    ) {
        this.isLoadingSubject = new BehaviorSubject<boolean>(false);
    }

    private getSettingsEngine(): SettingsEngineService {
        return this.injector.get(SettingsEngineService);
    }

    private getAccessToken(): string {
        return this.localStorageService.getAccessToken();
    }


    login(email: string, password: string): Observable<any> {
        this.isLoadingSubject.next(true);
        return this.apiServices.callAPI(100, '', [email, password]).pipe(
            tap((response: any) => {
                console.log('response', response);
                if (response?.success) {
                    this.setAuthFromResponseToLocalStorage(response);
                }
            }),
            switchMap((response: any) => {
                if (response?.success) {
                    return this.getLoginDataPackage(email).pipe(
                        switchMap((r) =>
                            this.getSettingsEngine()
                                .loadAllLayers(true)
                                .pipe(
                                    catchError(() => of(null)),
                                    map(() => r)
                                )
                        ),
                        switchMap((r) =>
                            this.loadUserPreferencesOnLogin().pipe(
                                catchError(() => of(undefined)),
                                map(() => r)
                            )
                        ),
                        switchMap(() => {
                            this.dashboardResolverService.invalidateUserTypeCache();
                            return this.dashboardResolverService.resolveCurrentUserType();
                        }),
                        tap(() => {
                            this.notificationRefreshService.requestRefresh();
                            const returnUrl = this.router.parseUrl(this.router.url).queryParams['returnUrl'];
                            void this.router.navigateByUrl(
                                returnUrl &&
                                    returnUrl.startsWith('/') &&
                                    !returnUrl.startsWith('//') &&
                                    !returnUrl.startsWith('/auth')
                                    ? returnUrl
                                    : '/dashboard',
                            );
                        })
                    );
                }
                return of(response);
            }),
            finalize(() => {
                this.isLoadingSubject.next(false);
            })
        );
    }

    verify2FA(email: string, otp: string): Observable<any> {
        this.isLoadingSubject.next(true);
        console.log('verify2FA email', email);
        console.log('verify2FA otp', otp);
        return this.apiServices.callAPI(101, '', [email.toString(), otp.toString()]).pipe(
            tap((response: any) => {
                console.log('verify2FA response service', response);
                if (response?.success) {
                    this.setAuthFromResponseToLocalStorage(response);
                }
            }),
            switchMap((response: any) => {
                if (response?.success) {
                    return this.getLoginDataPackage(email).pipe(
                        switchMap((r) =>
                            this.getSettingsEngine()
                                .loadAllLayers(true)
                                .pipe(
                                    catchError(() => of(null)),
                                    map(() => r)
                                )
                        ),
                        switchMap((r) =>
                            this.loadUserPreferencesOnLogin().pipe(
                                catchError(() => of(undefined)),
                                map(() => r)
                            )
                        ),
                        switchMap(() => {
                            this.dashboardResolverService.invalidateUserTypeCache();
                            return this.dashboardResolverService.resolveCurrentUserType();
                        }),
                        tap(() => {
                            this.notificationRefreshService.requestRefresh();
                            const returnUrl = this.router.parseUrl(this.router.url).queryParams['returnUrl'];
                            void this.router.navigateByUrl(
                                returnUrl &&
                                    returnUrl.startsWith('/') &&
                                    !returnUrl.startsWith('//') &&
                                    !returnUrl.startsWith('/auth')
                                    ? returnUrl
                                    : '/dashboard',
                            );
                        })
                    );
                }
                return of(response);
            }),
            finalize(() => {
                this.isLoadingSubject.next(false);
            })
        );
    }

    logout(): Observable<any> {
        this.isLoadingSubject.next(true);

        return this.apiServices.callAPI(102, this.getAccessToken(), []).pipe(
            tap(() => {
                this.localStorageService.clearLoginDataPackage();
            }),
            finalize(() => {
                window.location.reload();
                this.isLoadingSubject.next(false);
            })
        );
    }

    set2FA(status: boolean): Observable<any> {
        this.isLoadingSubject.next(true);
        return this.apiServices.callAPI(103, this.getAccessToken(), [status.toString()]).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }

    changePassword(oldPassword: string, newPassword: string): Observable<any> {
        this.isLoadingSubject.next(true);
        return this.apiServices.callAPI(104, this.getAccessToken(), [oldPassword, newPassword]).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }

    resetPasswordRequest(email: string): Observable<any> {
        this.isLoadingSubject.next(true);
        return this.apiServices.callAPI(105, '', [email]).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }

    resetPasswordConfirm(resetToken: string, newPassword: string): Observable<any> {
        this.isLoadingSubject.next(true);
        return this.apiServices.callAPI(106, '', [resetToken, newPassword]).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }

    verifyEmail(verificationToken: string): Observable<any> {
        this.isLoadingSubject.next(true);
        return this.apiServices.callAPI(107, '', [verificationToken]).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }

    getLoginDataPackage(email: string) {
        return this.apiServices.callAPI(110, this.getAccessToken(), [email]).pipe(
            tap((response: any) => {
                const accountData: IAccountStatusResponse = response.message;
                console.log('accountData', accountData);
                this.localStorageService.setLoginDataPackage(accountData);
            })
        );
    }

    private setAuthFromResponseToLocalStorage(response: any) {
        const payload = response.message;
        const token = payload.Access_Token;
        this.localStorageService.setToken(token);
    }

    private loadUserPreferencesOnLogin(): Observable<void> {
        const userId = Number(this.localStorageService.getUserDetails()?.User_ID || 0);
        if (!userId) {
            return of(undefined);
        }
        return this.profileApiService.getUserPreferences(userId).pipe(
            tap((response: any) => {
                if (!response?.success) {
                    return;
                }
                console.log('loadUserPreferencesOnLogin response', response);
                const message = response?.message;
                const raw =
                    message?.User_Preferences ??
                    message?.user_Preferences ??
                    (message && typeof message === 'object' && !Array.isArray(message) ? message : {});

                const dict: Record<string, string> = {};
                if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
                    Object.keys(raw).forEach((k) => {
                        const v = (raw as any)[k];
                        if (v == null) {
                            dict[k] = '';
                            return;
                        }
                        if (typeof v === 'object') {
                            try {
                                dict[k] = JSON.stringify(v);
                            } catch {
                                dict[k] = '';
                            }
                            return;
                        }
                        dict[k] = String(v);
                    });
                }

                const layoutConfigRaw = String(dict['layoutConfig'] || '').trim();
                if (!layoutConfigRaw) {
                    return;
                }

                let normalized = layoutConfigRaw;
                try {
                    const parsed = JSON.parse(layoutConfigRaw);
                    normalized = JSON.stringify(parsed);
                } catch { }

                localStorage.setItem('User_Preferences', normalized);
                localStorage.setItem('layoutConfig', normalized);
                this.layoutService.loadConfigFromStorage();
            }),
            map(() => undefined)
        );
    }
}
