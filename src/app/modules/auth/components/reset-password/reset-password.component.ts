import { Component, OnDestroy, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Observable, Subscription } from 'rxjs';
import { PasswordMatchValidator } from '../../../../core/validators/password-match.validator';
import { AbstractControl, FormBuilder, FormGroup, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';

export function passwordComplexityValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
        const value = control.value;
        if (!value) return null;

        const startsWithLetter = /^[A-Za-z]/.test(value);
        const hasLowercase = /[a-z]/.test(value);
        const hasUppercase = /[A-Z]/.test(value);
        const hasNumber = /[0-9]/.test(value);
        const hasSpecialChar = /[^A-Za-z0-9]/.test(value);

        const errors: ValidationErrors = {};
        if (!startsWithLetter) errors['doesNotStartWithLetter'] = true;
        if (!hasLowercase) errors['missingLowercase'] = true;
        if (!hasUppercase) errors['missingUppercase'] = true;
        if (!hasNumber) errors['missingNumber'] = true;
        if (!hasSpecialChar) errors['missingSpecialChar'] = true;

        return Object.keys(errors).length ? errors : null;
    };
}

@Component({
    selector: 'app-reset-password',
    templateUrl: './reset-password.component.html',
    styleUrl: './reset-password.component.scss',
})
export class ResetPasswordComponent implements OnInit, OnDestroy {
    private unsubscribe: Subscription[] = [];
    private countdownInterval: any = null;
    resetPassForm: FormGroup;
    resetToken: string = '';
    tenantLogoUrl: string;
    resetSuccess: boolean = false;
    redirectCountdown: number = 5;
    hasError: boolean = false;
    errorMessageKey = '';
    type: string = '';
    pageLabelKey = 'auth.reset-password.pages.default';
    isLoading$: Observable<boolean>;
    yearNow = new Date().getFullYear();

    constructor(
        private authService: AuthService,
        private route: ActivatedRoute,
        private router: Router,
        private fb: FormBuilder
    ) {
        this.isLoading$ = this.authService.isLoadingSubject;
        this.initForm();
    }

    ngOnInit(): void {
        const routeData = this.route.snapshot.data;
        if (routeData['type']) {
            this.type = routeData['type'];
        } else {
            this.type = this.route.snapshot.params['type'] || '';
        }
        this.setPageLabel();

        const queryParamsSub = this.route.queryParams.subscribe((queryParams) => {
            let resetToken = queryParams['reset-token'] || '';
            this.resetToken = decodeURIComponent(resetToken);
            this.resetToken = this.resetToken.replace(/ /g, '+');
        });
        this.unsubscribe.push(queryParamsSub);
    }

    private setPageLabel(): void {
        const labelMap: Record<string, string> = {
            'forgot-password': 'auth.reset-password.pages.forgot-password',
            'unlock-account': 'auth.reset-password.pages.unlock-account',
            'new-account': 'auth.reset-password.pages.new-account',
            'change-password': 'auth.reset-password.pages.change-password',
        };

        this.pageLabelKey = labelMap[this.type] || 'auth.reset-password.pages.default';
    }

    submit() {

        if (this.authService.isLoadingSubject.value) return;
        if (this.resetPassForm.invalid) {
            this.hasError = true;
            this.errorMessageKey = 'auth.reset-password.errors.invalidPassword';
            return;
        }

        const newPassword = this.resetPassForm.get('password')?.value;

        if (!this.resetToken) {
            this.hasError = true;
            this.errorMessageKey = 'auth.reset-password.errors.missingToken';
            return;
        }


        const resetSub = this.authService.resetPasswordConfirm(this.resetToken, newPassword).subscribe({
            next: (response: any) => {
                console.log('response', response);
                if (!response?.success) {
                    this.handleBusinessError(response);
                    return;
                }
                this.resetSuccess = true;
                this.startRedirectCountdown();
            },

        });

        this.unsubscribe.push(resetSub);
    }

    private handleBusinessError(error: any) {
        this.hasError = true;
        const code = (error.message).toString();
        switch (code) {

            case 'DAP11135':
                this.errorMessageKey = 'auth.reset-password.errors.invalidToken';
                return;
            case 'DAP11136':
                this.errorMessageKey = 'auth.reset-password.errors.invalidNewPassword';
                return;
            case 'DAP11137':
                this.errorMessageKey = 'auth.reset-password.errors.formatIncompliant';
                return;
            default:
                this.errorMessageKey = 'auth.reset-password.errors.unexpected';
                return;
        }
    }

    initForm() {
        this.resetPassForm = this.fb.group(
            {
                password: [
                    '',
                    Validators.compose([
                        Validators.required,
                        Validators.minLength(8),
                        Validators.maxLength(15),
                        passwordComplexityValidator(),
                    ]),
                ],
                cPassword: ['', Validators.compose([Validators.required])],
            },
            {
                validator: PasswordMatchValidator.MatchPassword,
            }
        );
    }

    getPasswordLength(): number {
        const password = this.resetPassForm.get('password')?.value || '';
        return password.length;
    }

    checkPasswordLength(): boolean {
        const password = this.resetPassForm.get('password')?.value || '';
        return password.length >= 8 && password.length <= 15;
    }

    checkStartsWithLetter(): boolean {
        const password = this.resetPassForm.get('password')?.value || '';
        return /^[A-Za-z]/.test(password);
    }

    checkHasUppercaseAndLowercase(): boolean {
        const password = this.resetPassForm.get('password')?.value || '';
        const hasLowercase = /[a-z]/.test(password);
        const hasUppercase = /[A-Z]/.test(password);
        return hasLowercase && hasUppercase;
    }

    checkHasNumber(): boolean {
        const password = this.resetPassForm.get('password')?.value || '';
        return /[0-9]/.test(password);
    }

    checkHasSpecialChar(): boolean {
        const password = this.resetPassForm.get('password')?.value || '';
        return /[^A-Za-z0-9]/.test(password);
    }

    private startRedirectCountdown(): void {
        this.redirectCountdown = 5;

        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
        }

        this.countdownInterval = setInterval(() => {
            this.redirectCountdown--;

            if (this.redirectCountdown <= 0) {
                clearInterval(this.countdownInterval);
                this.countdownInterval = null;
                this.router.navigate(['/auth']);
            }
        }, 1000);
    }

    ngOnDestroy(): void {
        this.unsubscribe.forEach((c) => {
            c.unsubscribe();
        });

        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
            this.countdownInterval = null;
        }
    }
}
