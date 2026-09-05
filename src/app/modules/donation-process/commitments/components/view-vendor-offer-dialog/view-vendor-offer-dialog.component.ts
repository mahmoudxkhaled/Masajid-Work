import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TranslationService } from 'src/app/core/services/translation.service';
import {
  VendorOfferListItem,
  getVendorOfferStatusLabelKey,
  getVendorOfferStatusSeverity,
} from '../../../models/vendor-offer.model';

@Component({
  standalone: false,
  selector: 'app-view-vendor-offer-dialog',
  templateUrl: './view-vendor-offer-dialog.component.html',
  styleUrl: './view-vendor-offer-dialog.component.scss',
})
export class ViewVendorOfferDialogComponent {
  @Input() visible = false;
  @Input() offer: VendorOfferListItem | null = null;

  @Output() visibleChange = new EventEmitter<boolean>();

  constructor(private translate: TranslationService) {}

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

  getStatusLabel(): string {
    if (!this.offer) {
      return '-';
    }
    const code = String(this.offer.statusCode || '').trim();
    if (!code && !this.offer.statusId) {
      return '-';
    }
    return this.translate.getInstant(getVendorOfferStatusLabelKey(this.offer.statusId, code));
  }

  getStatusSeverity() {
    if (!this.offer) {
      return 'secondary';
    }
    return getVendorOfferStatusSeverity(this.offer.statusId, this.offer.statusCode);
  }
}
