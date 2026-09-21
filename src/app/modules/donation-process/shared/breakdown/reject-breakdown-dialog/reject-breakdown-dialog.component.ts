import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { MessageService } from 'primeng/api';
import { TranslationService } from 'src/app/core/services/translation.service';
import { DonationBreakdownService } from '../../../services/donation-breakdown.service';

type RejectBreakdownDialogContext = 'reject';

@Component({
  standalone: false,
  selector: 'app-reject-breakdown-dialog',
  templateUrl: './reject-breakdown-dialog.component.html',
  styleUrl: './reject-breakdown-dialog.component.scss',
})
export class RejectBreakdownDialogComponent implements OnChanges {
  @Input() visible = false;
  @Input() donationBreakdownRequestId = 0;

  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() rejected = new EventEmitter<void>();
  @Output() refreshNeeded = new EventEmitter<void>();

  rejectionNote = '';
  isLoading$ = this.donationBreakdownService.isLoadingSubject.asObservable();

  constructor(
    private donationBreakdownService: DonationBreakdownService,
    private translate: TranslationService,
    private messageService: MessageService,
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible']?.currentValue === true) {
      this.rejectionNote = '';
    }
  }

  closeDialog(): void {
    this.visible = false;
    this.visibleChange.emit(false);
    this.rejectionNote = '';
  }

  confirmReject(): void {
    if (!this.donationBreakdownRequestId) {
      return;
    }

    const note = String(this.rejectionNote || '').trim();
    if (!note) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translate.getInstant('common.warning'),
        detail: this.translate.getInstant('donations.breakdown.rejectDialog.validation.noteRequired'),
      });
      return;
    }

    this.donationBreakdownService.rejectBreakdownRequest(this.donationBreakdownRequestId, note).subscribe({
      next: (response: any) => {
        console.log('rejectBreakdownRequest response', response);
        if (!response?.success) {
          this.handleBusinessError('reject', response);
          return;
        }

        this.closeDialog();
        this.rejected.emit();
      },
    });
  }

  private handleBusinessError(context: RejectBreakdownDialogContext, response: any): void {
    const code = String(response?.message || '');
    let detail: string | null = null;

    switch (context) {
      case 'reject':
        detail = this.getRejectErrorMessage(code);
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

  private getRejectErrorMessage(code: string): string | null {
    switch (code) {
      case 'DAP13006':
        return this.translate.getInstant('donations.breakdown.errors.invalidBreakdownRequestId');
      case 'DAP13010':
        return this.translate.getInstant('donations.breakdown.errors.statusNoLongerReviewable');
      case 'DAP13013':
        return this.translate.getInstant('donations.breakdown.errors.notOwnerFacility');
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
