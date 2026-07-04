import { NgModule } from '@angular/core';
import { AuthRoutingModule } from './auth-routing.module';
import { LoginComponent } from './components/login/login.component';
import { MessageService } from 'primeng/api';
import { EmailVerifiedComponent } from './components/email-verified/email-verified.component';
import { VerificationEmailComponent } from './components/verification-email/verification-email.component';
import { SharedModule } from 'src/app/Shared/shared/shared.module';
import { ResetPasswordComponent } from './components/reset-password/reset-password.component';
import { ForgetPasswordComponent } from './components/forget-password/forget-password.component';
import { AccountStatusComponent } from './components/account-status/account-status.component';
import { Verify2FAComponent } from './components/verify-2fa/verify-2fa.component';
import { APP_DEFAULT_LANGUAGE } from 'src/app/core/config/app-branding.config';
import { AuthBrandComponent } from './components/auth-brand/auth-brand.component';
import { LanguageDirService } from 'src/app/core/services/language-dir.service';
import { TranslationService } from 'src/app/core/services/translation.service';
import { Subscription } from 'rxjs';

@NgModule({
    declarations: [
        AuthBrandComponent,
        LoginComponent,
        EmailVerifiedComponent,
        VerificationEmailComponent,
        ResetPasswordComponent,
        ForgetPasswordComponent,
        Verify2FAComponent,
        AccountStatusComponent
    ],
    imports: [AuthRoutingModule, SharedModule],
    providers: [MessageService],
})
export class AuthModule {
    private langSub?: Subscription;

    constructor(
        private readonly translationService: TranslationService,
        private readonly languageDirService: LanguageDirService,
    ) {
        this.translationService.setDefaultLang(APP_DEFAULT_LANGUAGE);
        this.applyLocale();

        this.langSub = this.languageDirService.userLanguageCode$.subscribe(() => {
            this.applyLocale();
        });
    }

    private applyLocale(): void {
        const lang = this.languageDirService.getPublicLanguageCode();
        const isRtl = lang === 'ar';
        this.translationService.useLanguage(lang);
        document.documentElement.lang = lang;
        document.documentElement.setAttribute('dir', isRtl ? 'rtl' : 'ltr');
    }
}
