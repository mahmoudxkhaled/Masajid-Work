import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Subscription } from 'rxjs';
import { CurrencyLookup } from 'src/app/core/models/lookup.model';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';
import { PublicLookupService } from 'src/app/core/services/public-lookup.service';
import { TranslationService } from 'src/app/core/services/translation.service';
import { VendorOffersService } from '../../services/vendor-offers.service';

type CreateVendorOfferDialogContext = 'create';

@Component({
  standalone: false,
  selector: 'app-create-vendor-offer-dialog',
  templateUrl: './create-vendor-offer-dialog.component.html',
  styleUrl: './create-vendor-offer-dialog.component.scss',
})
export class CreateVendorOfferDialogComponent implements OnChanges {
  @Input() visible = false;
  @Input() donationRequestId = 0;

  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() created = new EventEmitter<number>();

  offerAmount: number | null = null;
  currencyCode = '';
  includesSupply = false;
  includesInstallation = false;
  description = '';
  validUntilDate: Date | null = null;
  minValidUntilDate = new Date();

  currencyOptions: { label: string; value: string }[] = [];
  isLoading$ = this.vendorOffersService.isLoadingSubject.asObservable();

  private currencies: CurrencyLookup[] = [];
  private subscriptions: Subscription[] = [];

  constructor(
    private vendorOffersService: VendorOffersService,
    private localStorageService: LocalStorageService,
    private lookupService: PublicLookupService,
    private translate: TranslationService,
    private messageService: MessageService,
    private router: Router,
  ) {
    this.loadCurrencies();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible']?.currentValue === true) {
      this.resetForm();
    }
  }

  closeDialog(): void {
    this.visible = false;
    this.visibleChange.emit(false);
    this.resetForm();
  }

  confirmCreate(): void {
    if (!this.validateForm()) {
      return;
    }

    const vendorEntityId = Number(this.localStorageService.getEntityId() || 0);
    if (!vendorEntityId) {
      this.showValidationError('donations.vendorOffers.form.validation.vendorEntityRequired');
      return;
    }

    this.vendorOffersService
      .createVendorOffer({
        donationRequestId: this.donationRequestId,
        vendorEntityId,
        offerAmount: Number(this.offerAmount),
        currencyCode: String(this.currencyCode || '').trim().toUpperCase(),
        includesSupply: this.includesSupply,
        includesInstallation: this.includesInstallation,
        description: String(this.description || '').trim(),
        validUntil: this.vendorOffersService.formatValidUntil(this.validUntilDate!),
      })
      .subscribe({
        next: (response: any) => {
          console.log('createVendorOffer response', response);
          if (!response?.success) {
            this.handleBusinessError('create', response);
            return;
          }

          const offerId = Number(response.message || 0);
          this.messageService.add({
            severity: 'success',
            summary: this.translate.getInstant('common.success'),
            detail: this.translate.getInstant('donations.vendorOffers.messages.created'),
          });
          this.closeDialog();
          this.created.emit(offerId);
          if (offerId) {
            void this.router.navigate(['/donations/vendor/offers', offerId]);
          }
        },
      });
  }

  private loadCurrencies(): void {
    const sub = this.lookupService.getCurrencies().subscribe({
      next: (items) => {
        this.currencies = items;
        this.currencyOptions = items.map((item) => ({
          label: `${item.code} - ${this.lookupService.getCurrencyLabel(item, this.localStorageService.isArabicUi())}`,
          value: String(item.code || '').trim().toUpperCase(),
        }));
      },
    });
    this.subscriptions.push(sub);
  }

  private resetForm(): void {
    this.offerAmount = null;
    this.currencyCode = '';
    this.includesSupply = false;
    this.includesInstallation = false;
    this.description = '';
    this.validUntilDate = null;
    this.minValidUntilDate = new Date();
    this.minValidUntilDate.setHours(0, 0, 0, 0);
  }

  private validateForm(): boolean {
    if (!this.offerAmount || Number(this.offerAmount) <= 0) {
      this.showValidationError('donations.vendorOffers.form.validation.offerAmountRequired');
      return false;
    }

    const currency = String(this.currencyCode || '').trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(currency)) {
      this.showValidationError('donations.vendorOffers.form.validation.currencyInvalid');
      return false;
    }

    if (!this.includesSupply && !this.includesInstallation) {
      this.showValidationError('donations.vendorOffers.form.validation.includesRequired');
      return false;
    }

    if (!String(this.description || '').trim()) {
      this.showValidationError('donations.vendorOffers.form.validation.descriptionRequired');
      return false;
    }

    if (!this.validUntilDate) {
      this.showValidationError('donations.vendorOffers.form.validation.validUntilRequired');
      return false;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selected = new Date(this.validUntilDate);
    selected.setHours(0, 0, 0, 0);
    if (selected < today) {
      this.showValidationError('donations.vendorOffers.form.validation.validUntilFuture');
      return false;
    }

    return true;
  }

  private showValidationError(key: string): void {
    this.messageService.add({
      severity: 'warn',
      summary: this.translate.getInstant('common.error'),
      detail: this.translate.getInstant(key),
    });
  }

  private handleBusinessError(context: CreateVendorOfferDialogContext, response: any): void {
    const code = String(response?.message || '');
    let detail: string | null = null;

    switch (context) {
      case 'create':
        detail = this.getCreateErrorMessage(code);
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

  private getCreateErrorMessage(code: string): string | null {
    switch (code) {
      case 'DAP13000':
        return this.translate.getInstant('donations.vendorOffers.errors.requestNotFound');
      case 'DAP13016':
        return this.translate.getInstant('donations.vendorOffers.errors.notVendor');
      case 'DAP13024':
        return this.translate.getInstant('donations.vendorOffers.errors.invalidOfferAmount');
      case 'DAP13021':
        return this.translate.getInstant('donations.vendorOffers.errors.invalidCurrency');
      case 'DAP13033':
        return this.translate.getInstant('donations.vendorOffers.errors.actionNotAccessible');
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
