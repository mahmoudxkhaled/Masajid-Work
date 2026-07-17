import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Subscription } from 'rxjs';
import { CurrencyLookup } from 'src/app/core/models/lookup.model';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';
import { PublicLookupService } from 'src/app/core/services/public-lookup.service';
import { TranslationService } from 'src/app/core/services/translation.service';
import { VendorOfferBackend } from '../../../models/vendor-offer.model';
import { VendorOffersService } from '../../services/vendor-offers.service';

type VendorOfferFormContext = 'load' | 'update';

@Component({
  standalone: false,
  selector: 'app-vendor-offer-form',
  templateUrl: './vendor-offer-form.component.html',
  styleUrl: './vendor-offer-form.component.scss',
})
export class VendorOfferFormComponent implements OnInit, OnDestroy {
  offerId = 0;
  loading = true;
  saving = false;

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
    private route: ActivatedRoute,
    private router: Router,
    private vendorOffersService: VendorOffersService,
    private localStorageService: LocalStorageService,
    private lookupService: PublicLookupService,
    private translate: TranslationService,
    private messageService: MessageService,
  ) {
    this.loadCurrencies();
  }

  ngOnInit(): void {
    this.offerId = Number(this.route.snapshot.paramMap.get('offerId') || 0);
    this.loadDetails();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  backToDetails(): void {
    this.router.navigate(['/donations/vendor/offers', this.offerId]);
  }

  submitUpdate(): void {
    if (!this.validateForm()) {
      return;
    }

    this.saving = true;
    this.vendorOffersService
      .updateVendorOffer({
        donationVendorOfferId: this.offerId,
        offerAmount: Number(this.offerAmount),
        currencyCode: String(this.currencyCode || '').trim().toUpperCase(),
        includesSupply: this.includesSupply,
        includesInstallation: this.includesInstallation,
        description: String(this.description || '').trim(),
        validUntil: this.vendorOffersService.formatValidUntil(this.validUntilDate!),
      })
      .subscribe({
        next: (response: any) => {
          console.log('updateVendorOffer response', response);
          this.saving = false;
          if (!response?.success) {
            this.handleBusinessError('update', response);
            return;
          }

          this.messageService.add({
            severity: 'success',
            summary: this.translate.getInstant('common.success'),
            detail: this.translate.getInstant('donations.vendorOffers.messages.updated'),
          });
          void this.router.navigate(['/donations/vendor/offers', this.offerId]);
        },
        error: () => {
          this.saving = false;
        },
      });
  }

  // #region Load data

  private loadDetails(): void {
    this.loading = true;
    const sub = this.vendorOffersService.getVendorOfferDetails(this.offerId).subscribe({
      next: (response: any) => {
        console.log('getVendorOfferDetails response', response);
        if (!response?.success) {
          this.handleBusinessError('load', response);
          this.loading = false;
          return;
        }

        const raw = (response.message ?? null) as VendorOfferBackend | null;
        const details = this.vendorOffersService.mapVendorOfferDetails(raw);
        if (details) {
          this.offerAmount = details.offerAmount;
          this.currencyCode = details.currencyCode;
          this.includesSupply = details.includesSupply;
          this.includesInstallation = details.includesInstallation;
          this.description = details.description;
          this.validUntilDate = details.validUntil ? new Date(details.validUntil) : null;
        }
        this.minValidUntilDate = new Date();
        this.minValidUntilDate.setHours(0, 0, 0, 0);
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
    this.subscriptions.push(sub);
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

  // #endregion

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

  private handleBusinessError(context: VendorOfferFormContext, response: any): void {
    const code = String(response?.message || '');
    let detail: string | null = null;

    switch (context) {
      case 'load':
        detail = this.getLoadErrorMessage(code);
        break;
      case 'update':
        detail = this.getUpdateErrorMessage(code);
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

  private getLoadErrorMessage(code: string): string | null {
    switch (code) {
      case 'DAP13004':
        return this.translate.getInstant('donations.vendorOffers.errors.offerNotFound');
      case 'DAP13016':
        return this.translate.getInstant('donations.vendorOffers.errors.notVendor');
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

  private getUpdateErrorMessage(code: string): string | null {
    switch (code) {
      case 'DAP13004':
        return this.translate.getInstant('donations.vendorOffers.errors.offerNotFound');
      case 'DAP13016':
        return this.translate.getInstant('donations.vendorOffers.errors.notVendor');
      case 'DAP13024':
        return this.translate.getInstant('donations.vendorOffers.errors.invalidOfferAmount');
      case 'DAP13021':
        return this.translate.getInstant('donations.vendorOffers.errors.invalidCurrency');
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
