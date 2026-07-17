import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Subscription } from 'rxjs';
import { LanguageDirService } from 'src/app/core/services/language-dir.service';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';
import { TranslationService } from 'src/app/core/services/translation.service';
import { VendorOfferBackend, VendorOfferListItem } from '../../../models/vendor-offer.model';
import { VendorOffersService } from '../../services/vendor-offers.service';

type VendorOffersListContext = 'list';

@Component({
  standalone: false,
  selector: 'app-vendor-offers-list',
  templateUrl: './vendor-offers-list.component.html',
  styleUrl: './vendor-offers-list.component.scss',
})
export class VendorOffersListComponent implements OnInit, OnDestroy {
  rows = 10;
  readonly rowsPerPageOptions = [10, 25, 50, 100];

  offers: VendorOfferListItem[] = [];
  first = 0;
  totalRecords = 0;
  tableLoadingSpinner = false;

  selectedStatusId: number | null = null;
  statusOptions: { label: string; value: number | null }[] = [];

  private rawOffers: VendorOfferBackend[] = [];
  private statusLabelById: Record<number, string> = {};
  private skeletonRows: VendorOfferListItem[] = this.createSkeletonRows();
  private subscriptions: Subscription[] = [];

  constructor(
    private vendorOffersService: VendorOffersService,
    private localStorageService: LocalStorageService,
    private languageDirService: LanguageDirService,
    private translate: TranslationService,
    private messageService: MessageService,
    private router: Router,
  ) { }

  ngOnInit(): void {
    this.statusOptions = [
      { label: this.translate.getInstant('donations.vendorOffers.filters.allStatuses'), value: null },
    ];
    this.subscriptions.push(
      this.languageDirService.userLanguageCode$.subscribe(() => {
        this.refreshOffers();
        this.rebuildStatusOptions();
      }),
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  get tableValue(): VendorOfferListItem[] {
    if (this.tableLoadingSpinner && this.offers.length === 0) {
      return this.skeletonRows;
    }
    return this.offers;
  }

  onPageChange(event: any): void {
    const first = event?.first ?? 0;
    const rows = event?.rows ?? this.rows;

    setTimeout(() => {
      this.first = first;
      this.rows = rows;
      this.skeletonRows = this.createSkeletonRows();
      this.loadOffers();
    });
  }

  onStatusFilterChange(): void {
    this.first = 0;
    this.loadOffers();
  }

  viewDetails(row: VendorOfferListItem, event?: Event): void {
    event?.stopPropagation();
    if (this.tableLoadingSpinner || !row.id) {
      return;
    }
    this.router.navigate(['/donations/vendor/offers', row.id]);
  }

  formatOfferAmount(row: VendorOfferListItem): string {
    if (!row.offerAmount) {
      return '-';
    }
    return `${row.offerAmount} ${row.currencyCode || ''}`.trim();
  }

  getIncludesLabel(includes: boolean): string {
    return includes
      ? this.translate.getInstant('donations.browse.yes')
      : this.translate.getInstant('donations.browse.no');
  }

  getStatusLabel(row: VendorOfferListItem): string {
    if (row.statusCode) {
      return row.statusCode;
    }
    return this.statusLabelById[row.statusId] || String(row.statusId || '-');
  }

  // #region Load data

  private loadOffers(): void {
    const vendorEntityId = Number(this.localStorageService.getEntityId() || 0);
    if (!vendorEntityId) {
      this.offers = [];
      this.totalRecords = 0;
      return;
    }

    this.tableLoadingSpinner = true;
    const currentPage = Math.floor(this.first / this.rows) + 1;
    const lastOfferId = -currentPage;
    const statusFilter = this.selectedStatusId ? [this.selectedStatusId] : [];

    const sub = this.vendorOffersService
      .listVendorOffers(vendorEntityId, statusFilter, lastOfferId, this.rows)
      .subscribe({
        next: (response: any) => {
          console.log('listVendorOffers response', response);
          if (!response?.success) {
            this.handleBusinessError('list', response);
            return;
          }

          this.totalRecords = Number(response.message.Total_Count);
          this.rawOffers = response.message.Offers;
          this.buildStatusMapsFromOffers();
          this.rebuildStatusOptions();
          this.refreshOffers();
        },
        error: () => {
          this.tableLoadingSpinner = false;
        },
        complete: () => {
          this.tableLoadingSpinner = false;
        },
      });
    this.subscriptions.push(sub);
  }

  // #endregion

  private refreshOffers(): void {
    this.offers = this.rawOffers.map((item) => this.vendorOffersService.mapVendorOfferListItem(item));
  }

  private buildStatusMapsFromOffers(): void {
    for (const item of this.rawOffers) {
      const id = Number(item.Vendor_Offer_Status_ID ?? item.Status ?? 0);
      if (!id || this.statusLabelById[id]) {
        continue;
      }
      const code = String(item.Status_Code || '').trim();
      this.statusLabelById[id] = code || String(id);
    }
  }

  private rebuildStatusOptions(): void {
    const dynamicOptions = Object.entries(this.statusLabelById).map(([id, label]) => ({
      label,
      value: Number(id),
    }));
    this.statusOptions = [
      { label: this.translate.getInstant('donations.vendorOffers.filters.allStatuses'), value: null },
      ...dynamicOptions,
    ];
  }

  private createSkeletonRows(): VendorOfferListItem[] {
    return Array(this.rows).fill(null).map(() => ({
      id: '',
      donationRequestId: '',
      requestTitle: '',
      offerAmount: 0,
      currencyCode: '',
      includesSupply: false,
      includesInstallation: false,
      statusId: 0,
      statusCode: '',
      validUntil: '',
      createdAt: '',
    }));
  }

  private handleBusinessError(context: VendorOffersListContext, response: any): void {
    const code = String(response?.message || '');
    let detail: string | null = null;

    switch (context) {
      case 'list':
        detail = this.getListErrorMessage(code);
        this.tableLoadingSpinner = false;
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

  private getListErrorMessage(code: string): string | null {
    switch (code) {
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
