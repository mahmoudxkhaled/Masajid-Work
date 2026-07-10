import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { MessageService } from 'primeng/api';
import { Router } from '@angular/router';
import { AcceptDonationRequest } from '../../../models/donation-commitment.model';
import {
  FulfillmentMode,
  isValidFulfillmentMode,
  requiresCharityEntity,
} from '../../../models/fulfillment-mode.model';
import { DonationCommitmentService } from '../../../commitments/services/donation-commitment.service';
import { TranslationService } from 'src/app/core/services/translation.service';

type AcceptDonationDialogContext = 'accept';

@Component({
  standalone: false,
  selector: 'app-accept-donation-dialog',
  templateUrl: './accept-donation-dialog.component.html',
  styleUrl: './accept-donation-dialog.component.scss',
})
export class AcceptDonationDialogComponent implements OnChanges {
  @Input() visible = false;
  @Input() donationRequestId = 0;

  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() accepted = new EventEmitter<number>();

  isAnonymous = false;
  fulfillmentMode = FulfillmentMode.SelfFulfillment;
  expectedClosureDate: Date | null = null;
  minClosureDate = new Date();

  readonly FulfillmentMode = FulfillmentMode;
  isLoading$ = this.donationCommitmentService.isLoadingSubject.asObservable();

  constructor(
    private donationCommitmentService: DonationCommitmentService,
    private translate: TranslationService,
    private messageService: MessageService,
    private router: Router,
  ) { }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible']?.currentValue === true) {
      this.resetForm();
    }
  }

  get canSubmit(): boolean {
    return Boolean(this.expectedClosureDate) && isValidFulfillmentMode(this.fulfillmentMode);
  }

  closeDialog(): void {
    this.visible = false;
    this.visibleChange.emit(false);
    this.resetForm();
  }

  confirmAccept(): void {
    if (!this.validateForm()) {
      return;
    }

    const dto: AcceptDonationRequest = {
      donationRequestId: this.donationRequestId,
      isAnonymous: this.isAnonymous,
      fulfillmentMode: this.fulfillmentMode,
      charityEntityId: 0,
      expectedClosureAt: this.formatExpectedClosureAt(this.expectedClosureDate!),
    };

    this.donationCommitmentService.acceptDonation(dto).subscribe({
      next: (response: any) => {
        console.log('acceptDonation response', response);
        if (!response?.success) {
          this.handleBusinessError('accept', response);
          return;
        }

        const commitmentId = Number(response.message || 0);
        this.messageService.add({
          severity: 'success',
          summary: this.translate.getInstant('common.success'),
          detail: this.translate.getInstant('donations.commitments.messages.accepted'),
        });
        this.closeDialog();
        this.accepted.emit(commitmentId);
        if (commitmentId) {
          void this.router.navigate(['/donations/commitments', commitmentId]);
        }
      },
    });
  }

  private resetForm(): void {
    this.isAnonymous = false;
    this.fulfillmentMode = FulfillmentMode.SelfFulfillment;
    this.expectedClosureDate = null;
    this.minClosureDate = new Date();
    this.minClosureDate.setHours(0, 0, 0, 0);
  }

  private validateForm(): boolean {
    if (!this.expectedClosureDate) {
      this.showValidationError('donations.commitments.acceptDialog.validation.expectedClosureRequired');
      return false;
    }

    const selected = new Date(this.expectedClosureDate);
    selected.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (selected < today) {
      this.showValidationError('donations.commitments.acceptDialog.validation.expectedClosureFuture');
      return false;
    }

    if (!isValidFulfillmentMode(this.fulfillmentMode)) {
      this.showValidationError('donations.commitments.acceptDialog.validation.fulfillmentModeRequired');
      return false;
    }

    if (requiresCharityEntity(this.fulfillmentMode)) {
      this.showValidationError('donations.commitments.acceptDialog.charityCentersPending');
      return false;
    }

    return true;
  }

  private formatExpectedClosureAt(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}T00:00:00`;
  }

  private showValidationError(key: string): void {
    this.messageService.add({
      severity: 'warn',
      summary: this.translate.getInstant('common.error'),
      detail: this.translate.getInstant(key),
    });
  }

  private handleBusinessError(context: AcceptDonationDialogContext, response: any): void {
    const code = String(response?.message || '');
    let detail: string | null = null;

    switch (context) {
      case 'accept':
        detail = this.getAcceptErrorMessage(code);
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

  private getAcceptErrorMessage(code: string): string | null {
    switch (code) {
      case 'DAP13000':
        return this.translate.getInstant('donations.commitments.errors.requestNotFound');
      case 'DAP13011':
        return this.translate.getInstant('donations.commitments.errors.notPublished');
      case 'DAP13012':
        return this.translate.getInstant('donations.commitments.errors.activeCommitmentExists');
      case 'DAP13025':
        return this.translate.getInstant('donations.commitments.errors.invalidFulfillmentMode');
      case 'DAP13026':
        return this.translate.getInstant('donations.commitments.errors.charityRequired');
      case 'DAP11055':
        return this.translate.getInstant('donations.commitments.errors.accessDenied');
      case 'DAP11040':
      case 'DAP11041':
      case 'DAP11042':
        return this.translate.getInstant('donations.commitments.errors.sessionExpired');
      default:
        return null;
    }
  }
}
