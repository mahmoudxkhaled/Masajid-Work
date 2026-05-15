import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { VerificationEmailComponent } from './components/verification-email/verification-email.component';
import { EmailVerifiedComponent } from './components/email-verified/email-verified.component';
import { ResetPasswordComponent } from './components/reset-password/reset-password.component';
import { ForgetPasswordComponent } from './components/forget-password/forget-password.component';
import { AccountStatusComponent } from './components/account-status/account-status.component';
import { Verify2FAComponent } from './components/verify-2fa/verify-2fa.component';

const routes: Routes = [
    { path: '', component: LoginComponent, data: { breadcrumb: 'login' } },

    { path: 'email-verified', component: EmailVerifiedComponent, data: { breadcrumb: 'emailVerified' } },

    { path: 'verify-email', component: VerificationEmailComponent, data: { breadcrumb: 'verifyEmail' } },

    {
        path: ':type/reset-password',
        component: ResetPasswordComponent,
        data: { allowed: ['forgot-password', 'unlock-account', 'new-account'], breadcrumb: 'resetPassword' }
    },
    {
        path: 'change-password',
        component: ResetPasswordComponent,
        data: { type: 'change-password', breadcrumb: 'resetPassword' }
    },
    { path: 'reset-password', component: ResetPasswordComponent, data: { breadcrumb: 'resetPassword' } },
    { path: 'forget-password', component: ForgetPasswordComponent, data: { breadcrumb: 'forgetPassword' } },
    { path: 'verify-2fa/:email', component: Verify2FAComponent, data: { breadcrumb: 'verify2fa' } },
    { path: 'account-status', component: AccountStatusComponent, data: { breadcrumb: 'accountStatus' } },
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule],
})
export class AuthRoutingModule { }
