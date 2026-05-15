import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-verification-email',
  templateUrl: './verification-email.component.html',
  styleUrl: './verification-email.component.scss'
})
export class VerificationEmailComponent implements OnInit, OnDestroy {
  private unsubscribe: Subscription[] = [];
  private countdownInterval: any = null;
  verificationToken: string = '';
  isVerifying: boolean = false;
  verificationSuccess: boolean = false;
  errorMessage: string = '';
  redirectCountdown: number = 5;
  yearNow = new Date().getFullYear();
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService
  ) { }

  private readonly INVALID_LINK_MESSAGE = 'Verification link is invalid or has expired.';

  ngOnInit(): void {
    const queryParamsSub = this.route.queryParams.subscribe(params => {
      this.verificationToken = params['verification-token'] || '';

      if (this.verificationToken) {
        this.verifyEmail();
      } else {
        this.handleError(this.INVALID_LINK_MESSAGE);
      }
    });
    this.unsubscribe.push(queryParamsSub);
  }

  verifyEmail(): void {
    if (!this.verificationToken) {
      this.handleError(this.INVALID_LINK_MESSAGE);
      return;
    }

    this.isVerifying = true;
    this.errorMessage = '';
    this.verificationSuccess = false;

    const verifySub = this.authService.verifyEmail(this.verificationToken).subscribe({
      next: (response: any) => {
        if (!response?.success) {
          this.handleError(this.INVALID_LINK_MESSAGE);
          return;
        }
        this.verificationSuccess = true;
        this.startRedirectCountdown();
      },
    });

    this.unsubscribe.push(verifySub);
  }

  private handleError(message: string): void {
    this.errorMessage = message;
    this.isVerifying = false;
  }

  private startRedirectCountdown(): void {
    this.isVerifying = false;
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
    this.unsubscribe.forEach((u) => u.unsubscribe());

    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
  }
}
