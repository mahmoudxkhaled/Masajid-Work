import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MessageService } from 'primeng/api';
import { TranslationService } from 'src/app/core/services/translation.service';
import { VendorOfferListItem } from '../../../models/vendor-offer.model';
import { VendorOffersService } from '../../../vendor-offers/services/vendor-offers.service';

type SelectVendorOfferDialogContext = 'select';

@Component({
  standalone: false,
  selector: 'app-select-vendor-offer-dialog',
  templateUrl: './select-vendor-offer-dialog.component.html',
  styleUrl: './select-vendor-offer-dialog.component.scss',
})
export class SelectVendorOfferDialogComponent {
  @Input() visible = false;
  @Input() offer: VendorOfferListItem | null = null;

  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() selected = new EventEmitter<void>();

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

  formatOfferAmount(): string {
    if (!this.offer) {
      return '-';
    }
    const amount = this.offer.offerAmount;
    const currency = this.offer.currencyCode || '';
    if (!amount && !currency) {
      return '-';
    }
    return currency ? `${amount} ${currency}` : String(amount);
  }

  getYesNo(value: boolean): string {
    return value
      ? this.translate.getInstant('donations.browse.yes')
      : this.translate.getInstant('donations.browse.no');
  }

  getVendorLabel(): string {
    if (!this.offer?.vendorEntityId) {
      return '-';
    }
    return `#${this.offer.vendorEntityId}`;
  }

  confirmSelect(): void {
    const offerId = Number(this.offer?.id || 0);
    if (!offerId) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translate.getInstant('common.error'),
        detail: this.translate.getInstant('donations.commitments.vendorOffers.errors.offerNotFound'),
      });
      return;
    }
    console.log('offerId to select', offerId);

    this.vendorOffersService.selectVendorOffer(offerId).subscribe({
      next: (response: any) => {
        console.log('selectVendorOffer response', response);
        if (!response?.success) {
          this.handleBusinessError('select', response);
          return;
        }

        this.messageService.add({
          severity: 'success',
          summary: this.translate.getInstant('common.success'),
          detail: this.translate.getInstant('donations.commitments.vendorOffers.messages.selected'),
        });
        this.closeDialog();
        this.selected.emit();
      },
    });
  }

  private handleBusinessError(context: SelectVendorOfferDialogContext, response: any): void {
    const code = String(response?.message || '');
    let detail: string | null = null;

    switch (context) {
      case 'select':
        detail = this.getSelectErrorMessage(code);
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

  private getSelectErrorMessage(code: string): string | null {
    switch (code) {
      case 'DAP13004':
        return this.translate.getInstant('donations.commitments.vendorOffers.errors.offerNotFound');
      case 'DAP13014':
        return this.translate.getInstant('donations.commitments.vendorOffers.errors.notDonor');
      case 'DAP13010':
        return this.translate.getInstant('donations.commitments.vendorOffers.errors.invalidStatus');
      case 'DAP11055':
        return this.translate.getInstant('donations.commitments.vendorOffers.errors.accessDenied');
      case 'DAP11040':
      case 'DAP11041':
      case 'DAP11042':
        return this.translate.getInstant('donations.commitments.vendorOffers.errors.sessionExpired');
      default:
        return null;
    }
  }
}
