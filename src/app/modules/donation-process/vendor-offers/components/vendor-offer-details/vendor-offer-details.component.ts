import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Subscription } from 'rxjs';
import { TranslationService } from 'src/app/core/services/translation.service';
import { VendorOfferBackend, VendorOfferDetails } from '../../../models/vendor-offer.model';
import { VendorOffersService } from '../../services/vendor-offers.service';

type VendorOfferDetailsContext = 'load';

@Component({
  standalone: false,
  selector: 'app-vendor-offer-details',
  templateUrl: './vendor-offer-details.component.html',
  styleUrl: './vendor-offer-details.component.scss',
})
export class VendorOfferDetailsComponent implements OnInit, OnDestroy {
  offerId = 0;
  loading = true;
  details: VendorOfferDetails | null = null;
  withdrawDialogVisible = false;

  private rawDetails: VendorOfferBackend | null = null;
  private subscriptions: Subscription[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private vendorOffersService: VendorOffersService,
    private translate: TranslationService,
    private messageService: MessageService,
  ) { }

  ngOnInit(): void {
    this.offerId = Number(this.route.snapshot.paramMap.get('offerId') || 0);
    this.loadDetails();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  get canEdit(): boolean {
    return this.vendorOffersService.isActiveOffer(this.details);
  }

  get canWithdraw(): boolean {
    return this.vendorOffersService.isActiveOffer(this.details);
  }

  backToList(): void {
    this.router.navigate(['/donations/vendor/offers']);
  }

  editOffer(): void {
    if (!this.canEdit || !this.offerId) {
      return;
    }
    this.router.navigate(['/donations/vendor/offers', this.offerId, 'edit']);
  }

  openWithdrawDialog(): void {
    this.withdrawDialogVisible = true;
  }

  onWithdrawn(): void {
    this.router.navigate(['/donations/vendor/offers']);
  }

  formatOfferAmount(): string {
    if (!this.details?.offerAmount) {
      return '-';
    }
    return `${this.details.offerAmount} ${this.details.currencyCode || ''}`.trim();
  }

  getIncludesLabel(value: boolean): string {
    return value
      ? this.translate.getInstant('donations.browse.yes')
      : this.translate.getInstant('donations.browse.no');
  }

  getStatusLabel(): string {
    if (!this.details) {
      return '-';
    }
    return this.details.statusCode || String(this.details.statusId || '-');
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

        this.rawDetails = (response.message ?? null) as VendorOfferBackend | null;
        this.details = this.vendorOffersService.mapVendorOfferDetails(this.rawDetails);
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
    this.subscriptions.push(sub);
  }

  // #endregion

  private handleBusinessError(context: VendorOfferDetailsContext, response: any): void {
    const code = String(response?.message || '');
    let detail: string | null = null;

    switch (context) {
      case 'load':
        detail = this.getLoadErrorMessage(code);
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
}
