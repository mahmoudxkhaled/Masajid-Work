import { Component, OnDestroy, OnInit, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { ActivatedRoute, Router } from '@angular/router';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';
import { Observable, Subscription } from 'rxjs';
import { LanguageDirService } from 'src/app/core/services/language-dir.service';

@Component({
  selector: 'app-verify-2fa',
  templateUrl: './verify-2fa.component.html',
  styleUrl: './verify-2fa.component.scss'
})
export class Verify2FAComponent implements OnInit, OnDestroy, AfterViewInit {

  email: string = '';
  validationMessage: string = '';
  form: FormGroup;
  isLoading$: Observable<boolean>;
  unsubscribe: Subscription[] = [];
  @ViewChild('code1Input') code1Input!: ElementRef<HTMLInputElement>;
  yearNow = new Date().getFullYear();
  constructor(
    private apiService: AuthService,
    private router: Router,
    private localStorageService: LocalStorageService,
    private route: ActivatedRoute,
    private rtlService: LanguageDirService
  ) {
    this.isLoading$ = this.apiService.isLoadingSubject;
  }

  ngOnInit(): void {

    if (this.localStorageService.getToken()) {
      this.router.navigate(['/']);
    }

    this.email = this.route.snapshot.params['email'];

    this.form = new FormGroup({
      code1: new FormControl<string>('', Validators.required),
      code2: new FormControl<string>('', Validators.required),
      code3: new FormControl<string>('', Validators.required),
      code4: new FormControl<string>('', Validators.required),
      code5: new FormControl<string>('', Validators.required),
      code6: new FormControl<string>('', Validators.required),
    });
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      const firstInput = document.getElementById('code1') as HTMLInputElement;
      if (firstInput) {
        firstInput.focus();
      }
    }, 100);
  }

  verify2FA() {
    this.validationMessage = '';

    if (this.form.invalid) {
      this.validationMessage = 'Please enter all digits';
      return;
    }

    const otp = [
      this.form.controls?.['code1'].value,
      this.form.controls?.['code2'].value,
      this.form.controls?.['code3'].value,
      this.form.controls?.['code4'].value,
      this.form.controls?.['code5'].value,
      this.form.controls?.['code6'].value,
    ].join('');

    if (otp && this.email) {
      const verifySubscription = this.apiService.verify2FA(this.email, otp).subscribe({
        next: (response: any) => {
          console.log('verify2FA response', response);
          if (response?.success) {
            console.log('verify2FA response success');
            this.handleSuccessfulLogin();
          } else {
            console.log('verify2FA response error', response);
            this.validationMessage = 'Invalid verification code. Please try again.';
          }
        },
      });
      this.unsubscribe.push(verifySubscription);
    }
  }

  handleSuccessfulLogin() {
    const userLang = this.rtlService.getLanguageFromStorage();
    this.rtlService.setUserLanguageCode(userLang);
    this.rtlService.setRtl(userLang === 'ar');
  }

  moveToNext(event: any, nextInputId: string): void {
    const input = event.target as HTMLInputElement;
    if (input.value.length === 1 && /^[0-9]$/.test(input.value)) {
      if (nextInputId) {
        const nextInput = document.getElementById(nextInputId) as HTMLInputElement;
        nextInput?.focus();
      } else {
        setTimeout(() => {
          const allCodesFilled =
            this.form.get('code1')?.value &&
            this.form.get('code2')?.value &&
            this.form.get('code3')?.value &&
            this.form.get('code4')?.value &&
            this.form.get('code5')?.value &&
            this.form.get('code6')?.value;

          if (allCodesFilled && this.form.valid) {
            this.verify2FA();
          }
        }, 150);
      }
    }
  }

  moveToPrev(event: any, prevInputId: string): void {
    this.validationMessage = ''
    const input = event.target as HTMLInputElement;
    if (event.key === 'Backspace' && input.value === '') {
      const prevInput = document.getElementById(prevInputId) as HTMLInputElement;
      prevInput?.focus();
    }
  }

  ngOnDestroy(): void {
    this.unsubscribe.forEach((u) => u.unsubscribe());
  }
}
