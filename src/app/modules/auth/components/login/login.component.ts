import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, Subscription } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { LanguageDirService } from 'src/app/core/services/language-dir.service';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';

@Component({
    templateUrl: './login.component.html',
    styleUrls: ['./login.component.scss'],
})
export class LoginComponent implements OnInit, OnDestroy {
    loginBannerKey: string | null = null;
    loginBannerParams: { [key: string]: string } | undefined;
    loginBannerIsError = false;
    loginCreditials!: FormGroup;
    unsubscribe: Subscription[] = [];
    isLoading$: Observable<boolean>;
    showPassword: boolean = false;

    currentIndex = 0;
    typingSpeed = 100;
    pauseTime = 3000;

    yearNow = new Date().getFullYear();

    get email() {
        return this.loginCreditials.get('email');
    }

    get password() {
        return this.loginCreditials.get('password');
    }

    constructor(
        private authService: AuthService,
        private router: Router,
        private route: ActivatedRoute,
        private rtlService: LanguageDirService,
        private localStorageService: LocalStorageService
    ) {
        this.isLoading$ = this.authService.isLoadingSubject;
    }

    ngOnInit(): void {
        if (this.localStorageService.getToken()) {
            this.router.navigate(['/']);
        }

        const sessionExpired = this.route.snapshot.queryParamMap.get('sessionExpired');
        if (sessionExpired === '1' || sessionExpired === 'true') {
            this.setLoginBanner('auth.login.sessionExpired', undefined, false);
            this.router.navigate(['/auth'], { replaceUrl: true });
        }

        this.initForm();
        const userLang = this.rtlService.getLanguageFromStorage();
        this.rtlService.setRtl(userLang === 'ar');
    }

    initForm() {
        this.loginCreditials = new FormGroup({
            email: new FormControl<string>('96cpp82uzi@bltiwd.com', [Validators.required, Validators.email]),
            password: new FormControl<string>('Kakuzu@123456', [Validators.required]),
        });
    }

    submit() {
        if (this.authService.isLoadingSubject.value) return;

        if (this.loginCreditials.invalid) {
            this.setLoginBanner('auth.login.validationInvalid');
            return;
        }

        this.clearLoginBanner();
        const email = this.email?.value as string;
        const password = this.password?.value as string;

        const loginSubscription = this.authService.login(email, password).subscribe({
            next: (response: any) => {
                if (!response?.success) {
                    this.handleBusinessError(response, email);
                    return;
                }
                this.handleSuccessfulLogin();
            },
        });

        this.unsubscribe.push(loginSubscription);
    }

    private handleBusinessError(error: any, email: string) {
        const code = (error.message).toString();
        switch (code) {

            case 'ERP11100':
                this.clearLoginBanner();
                this.router.navigate(['/auth/account-status'], { queryParams: { status: 'Inactive' } });
                return;
            case 'ERP11101':
                this.clearLoginBanner();
                this.router.navigate(['/auth/email-verified'], { queryParams: { email: email } });
                return;
            case 'ERP11102':
                this.clearLoginBanner();
                this.router.navigate(['/auth/account-status'], { queryParams: { status: 'Locked' } });
                return;
            case 'ERP11103':
                this.clearLoginBanner();
                this.router.navigate(['/auth/verify-2fa', email]);
                return;
            case 'ERP11104':
                this.setLoginBanner('auth.login.invalidCredentials');
                return;
            default:
                this.setLoginBanner('auth.login.signInFailedWithCode', { code: code || '—' });
                return;
        }
    }

    private setLoginBanner(key: string, params?: { [key: string]: string }, isError = true): void {
        this.loginBannerKey = key;
        this.loginBannerParams = params;
        this.loginBannerIsError = isError;
    }

    private clearLoginBanner(): void {
        this.loginBannerKey = null;
        this.loginBannerParams = undefined;
        this.loginBannerIsError = false;
    }

    handleSuccessfulLogin() {
        this.clearLoginBanner();
        const userLang = this.rtlService.getLanguageFromStorage();
        this.rtlService.setUserLanguageCode(userLang);
        this.rtlService.setRtl(userLang === 'ar');
    }

    togglePasswordVisibility(): void {
        this.showPassword = !this.showPassword;
    }

    ngOnDestroy(): void {
        this.unsubscribe.forEach((u) => u.unsubscribe());
    }
}
