import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MessageService } from 'primeng/api';
import { TranslationService } from 'src/app/core/services/translation.service';
import { VendorOffersService } from '../../services/vendor-offers.service';

type WithdrawVendorOfferDialogContext = 'withdraw';

@Component({
  standalone: false,
  selector: 'app-withdraw-vendor-offer-dialog',
  templateUrl: './withdraw-vendor-offer-dialog.component.html',
  styleUrl: './withdraw-vendor-offer-dialog.component.scss',
})
export class WithdrawVendorOfferDialogComponent {
  @Input() visible = false;
  @Input() donationVendorOfferId = 0;

  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() withdrawn = new EventEmitter<void>();

  isLoading$ = this.vendorOffersService.isLoadingSubject.asObservable();

  constructor(
    private vendorOffersService: VendorOffersService,
    private translate: TranslationService,
    private messageService: MessageService,
  ) { }

  closeDialog(): void {
    this.visible = false;
    this.visibleChange.emit(false);
  }

  confirmWithdraw(): void {
    this.vendorOffersService.withdrawVendorOffer(this.donationVendorOfferId).subscribe({
      next: (response: any) => {
        console.log('withdrawVendorOffer response', response);
        if (!response?.success) {
          this.handleBusinessError('withdraw', response);
          return;
        }

        this.messageService.add({
          severity: 'success',
          summary: this.translate.getInstant('common.success'),
          detail: this.translate.getInstant('donations.vendorOffers.messages.withdrawn'),
        });
        this.closeDialog();
        this.withdrawn.emit();
      },
    });
  }

  private handleBusinessError(context: WithdrawVendorOfferDialogContext, response: any): void {
    const code = String(response?.message || '');
    let detail: string | null = null;

    switch (context) {
      case 'withdraw':
        detail = this.getWithdrawErrorMessage(code);
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

  private getWithdrawErrorMessage(code: string): string | null {
    switch (code) {
      case 'DAP13004':
        return this.translate.getInstant('donations.vendorOffers.errors.offerNotFound');
      case 'DAP13016':
        return this.translate.getInstant('donations.vendorOffers.errors.notVendor');
      case 'DAP11055':
        return this.translate.getInstant('donations.vendorOffers.errors.accessDenied');
      case 'DAP11040':
      case 'DAP11041':
      case 'DAP11042':
        return this.translate.getInstant('donations.vendorOffers.errors.sessionExpired');
      default:
        return null;
    }
  }
}
