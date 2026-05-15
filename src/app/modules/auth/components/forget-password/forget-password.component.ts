import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Observable, Subscription } from 'rxjs';
import { AuthService } from '../../services/auth.service';

const RESEND_COOLDOWN_END_KEY = 'forgetPasswordResendCooldownEnd';
const RESEND_COOLDOWN_SECONDS = 120;

@Component({
  selector: 'app-forget-password',
  templateUrl: './forget-password.component.html',
  styleUrl: './forget-password.component.scss'
})
export class ForgetPasswordComponent implements OnInit, OnDestroy {

  loginCreditials: FormGroup;
  validationMessage: string = '';
  successMessage: string = '';
  isLoading$: Observable<boolean>;
  unsubscribe: Subscription[] = [];
  yearNow = new Date().getFullYear();

  /** Seconds left before Resend is allowed (2 min cooldown after sending). */
  resendCooldownSeconds: number = 0;
  private resendCooldownTimer: ReturnType<typeof setInterval> | null = null;

  get email() {
    return this.loginCreditials.get('email');
  }

  constructor(
    private apiService: AuthService,
    private ref: ChangeDetectorRef
  ) {
    this.isLoading$ = this.apiService.isLoadingSubject;
  }

  ngOnInit(): void {
    this.initForm();
    this.restoreResendCooldownIfAny();
  }

  initForm() {
    this.loginCreditials = new FormGroup({
      email: new FormControl<String>('mahmoudxkhaled@gmail.com', [Validators.required, Validators.email]),
    });
  }

  sendCode() {
    if (this.loginCreditials.invalid) {
      this.validationMessage = 'Please enter a valid email address';
      this.successMessage = '';
      return;
    }

    this.validationMessage = '';
    this.successMessage = '';
    const emailValue = (this.email?.value as string).trim();

    if (!emailValue) {
      this.validationMessage = 'Please enter your email address';
      return;
    }

    const requestSub = this.apiService.resetPasswordRequest(emailValue).subscribe({
      next: (response: any) => {

        if (!response?.success) {
          this.validationMessage = 'Invalid email address format';
          this.successMessage = '';
          return;
        }
        this.successMessage = 'If you have a Business Suite account, you will receive a reset link via an email shortly';
        this.validationMessage = '';
        this.startResendCooldown();
      },
    });
    this.unsubscribe.push(requestSub);
  }

  private startResendCooldown(): void {
    this.clearResendCooldownTimer();
    this.resendCooldownSeconds = RESEND_COOLDOWN_SECONDS;
    const endTime = Date.now() + RESEND_COOLDOWN_SECONDS * 1000;
    localStorage.setItem(RESEND_COOLDOWN_END_KEY, String(endTime));
    this.resendCooldownTimer = setInterval(() => {
      this.resendCooldownSeconds--;
      if (this.resendCooldownSeconds <= 0) {
        this.clearResendCooldownTimer();
        localStorage.removeItem(RESEND_COOLDOWN_END_KEY);
      }
      this.ref.detectChanges();
    }, 1000);
  }

  private restoreResendCooldownIfAny(): void {
    const stored = localStorage.getItem(RESEND_COOLDOWN_END_KEY);
    if (!stored) return;
    const endTime = Number(stored);
    if (isNaN(endTime)) {
      localStorage.removeItem(RESEND_COOLDOWN_END_KEY);
      return;
    }
    const remainingMs = endTime - Date.now();
    if (remainingMs <= 0) {
      localStorage.removeItem(RESEND_COOLDOWN_END_KEY);
      return;
    }
    this.resendCooldownSeconds = Math.ceil(remainingMs / 1000);
    this.successMessage = 'If you have a Business Suite account, you will receive a reset link via an email shortly';
    this.resendCooldownTimer = setInterval(() => {
      this.resendCooldownSeconds--;
      if (this.resendCooldownSeconds <= 0) {
        this.clearResendCooldownTimer();
        localStorage.removeItem(RESEND_COOLDOWN_END_KEY);
      }
      this.ref.detectChanges();
    }, 1000);
  }

  private clearResendCooldownTimer(): void {
    if (this.resendCooldownTimer != null) {
      clearInterval(this.resendCooldownTimer);
      this.resendCooldownTimer = null;
    }
  }

  getResendCooldownLabel(): string {
    if (this.resendCooldownSeconds <= 0) return '';
    const m = Math.floor(this.resendCooldownSeconds / 60);
    const s = this.resendCooldownSeconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  ngOnDestroy(): void {
    this.clearResendCooldownTimer();
    this.unsubscribe.forEach((u) => u.unsubscribe());
  }
}
