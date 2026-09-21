import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MessageService } from 'primeng/api';
import { TranslationService } from 'src/app/core/services/translation.service';
import { DonationBreakdownService } from '../../../services/donation-breakdown.service';

type ApplyBreakdownDialogContext = 'apply';

@Component({
  standalone: false,
  selector: 'app-apply-breakdown-dialog',
  templateUrl: './apply-breakdown-dialog.component.html',
  styleUrl: './apply-breakdown-dialog.component.scss',
})
export class ApplyBreakdownDialogComponent {
  @Input() visible = false;
  @Input() donationBreakdownRequestId = 0;

  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() applied = new EventEmitter<number[]>();
  @Output() refreshNeeded = new EventEmitter<void>();

  isLoading$ = this.donationBreakdownService.isLoadingSubject.asObservable();

  constructor(
    private donationBreakdownService: DonationBreakdownService,
    private translate: TranslationService,
    private messageService: MessageService,
  ) {}

  closeDialog(): void {
    this.visible = false;
    this.visibleChange.emit(false);
  }

  confirmApply(): void {
    if (!this.donationBreakdownRequestId) {
      return;
    }

    this.donationBreakdownService.applyBreakdownRequest(this.donationBreakdownRequestId).subscribe({
      next: (response: any) => {
        console.log('applyBreakdownRequest response', response);
        if (!response?.success) {
          this.handleBusinessError('apply', response);
          return;
        }

        this.closeDialog();
        this.applied.emit(this.donationBreakdownService.extractSubRequestIds(response.message));
      },
    });
  }

  private handleBusinessError(context: ApplyBreakdownDialogContext, response: any): void {
    const code = String(response?.message || '');
    let detail: string | null = null;

    switch (context) {
      case 'apply':
        detail = this.getApplyErrorMessage(code);
        break;
    }

    if (detail) {
      this.messageService.add({
        severity: 'error',
        summary: this.translate.getInstant('common.error'),
        detail,
      });
    }

    if (code === 'DAP13010') {
      this.refreshNeeded.emit();
    }
  }

  private getApplyErrorMessage(code: string): string | null {
    switch (code) {
      case 'DAP13006':
        return this.translate.getInstant('donations.breakdown.errors.invalidBreakdownRequestId');
      case 'DAP13010':
        return this.translate.getInstant('donations.breakdown.errors.statusNoLongerReviewable');
      case 'DAP13033':
        return this.translate.getInstant('donations.breakdown.errors.actionNotAccessible');
      case 'DAP11055':
        return this.translate.getInstant('donations.breakdown.errors.reviewAccessDenied');
      case 'DAP11040':
      case 'DAP11041':
      case 'DAP11042':
        return this.translate.getInstant('donations.breakdown.errors.sessionExpired');
      default:
        return this.translate.getInstant('donations.breakdown.errors.actionFailed');
    }
  }
}
