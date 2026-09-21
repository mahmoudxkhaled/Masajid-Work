import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MessageService } from 'primeng/api';
import { TranslationService } from 'src/app/core/services/translation.service';
import { DonationBreakdownService } from '../../../services/donation-breakdown.service';

type ConfirmBreakdownDialogContext = 'confirm';

@Component({
  standalone: false,
  selector: 'app-confirm-breakdown-dialog',
  templateUrl: './confirm-breakdown-dialog.component.html',
  styleUrl: './confirm-breakdown-dialog.component.scss',
})
export class ConfirmBreakdownDialogComponent {
  @Input() visible = false;
  @Input() donationBreakdownRequestId = 0;

  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() confirmed = new EventEmitter<void>();

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

  confirm(): void {
    if (!this.donationBreakdownRequestId) {
      return;
    }

    this.donationBreakdownService.confirmBreakdownRequest(this.donationBreakdownRequestId).subscribe({
      next: (response: any) => {
        console.log('confirmBreakdownRequest response', response);
        if (!response?.success) {
          this.handleBusinessError('confirm', response);
          return;
        }

        this.closeDialog();
        this.confirmed.emit();
      },
    });
  }

  private handleBusinessError(context: ConfirmBreakdownDialogContext, response: any): void {
    const code = String(response?.message || '');
    let detail: string | null = null;

    switch (context) {
      case 'confirm':
        detail = this.getConfirmErrorMessage(code);
        break;
    }

    if (detail) {
      this.messageService.add({
        severity: 'error',
        summary: this.translate.getInstant('common.error'),
        detail,
      });
    }
  }

  private getConfirmErrorMessage(code: string): string | null {
    switch (code) {
      case 'DAP13006':
        return this.translate.getInstant('donations.breakdown.errors.invalidBreakdownRequestId');
      case 'DAP13013':
        return this.translate.getInstant('donations.breakdown.errors.notOwnerFacility');
      case 'DAP13010':
        return this.translate.getInstant('donations.breakdown.errors.invalidStatus');
      case 'DAP13033':
        return this.translate.getInstant('donations.breakdown.errors.actionNotAccessible');
      case 'DAP11055':
        return this.translate.getInstant('donations.breakdown.errors.accessDenied');
      case 'DAP11040':
      case 'DAP11041':
      case 'DAP11042':
        return this.translate.getInstant('donations.breakdown.errors.sessionExpired');
      default:
        return this.translate.getInstant('donations.breakdown.errors.actionFailed');
    }
  }
}
