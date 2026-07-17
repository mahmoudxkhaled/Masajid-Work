import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Subscription, forkJoin } from 'rxjs';
import { CountryLookup } from 'src/app/core/models/lookup.model';
import { LanguageDirService } from 'src/app/core/services/language-dir.service';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';
import { PublicLookupService } from 'src/app/core/services/public-lookup.service';
import { TranslationService } from 'src/app/core/services/translation.service';
import { DonationCategoryBackend } from '../../../models/donation-category.model';
import { DonationRequestBackend } from '../../../models/donation-request.model';
import { DonationTypeBackend } from '../../../models/donation-type.model';
import { DonationReferenceService } from '../../../services/donation-reference.service';
import { VendorOffersService } from '../../services/vendor-offers.service';

type VendorRequestsListContext = 'list';

@Component({
  standalone: false,
  selector: 'app-vendor-requests-list',
  templateUrl: './vendor-requests-list.component.html',
  styleUrl: './vendor-requests-list.component.scss',
})
export class VendorRequestsListComponent implements OnInit, OnDestroy {
  rows = 10;
  readonly rowsPerPageOptions = [10, 25, 50, 100];

  requests: DonationRequestBackend[] = [];
  first = 0;
  totalRecords = 0;
  tableLoadingSpinner = false;
  initialLoading = true;

  selectedCategoryId: number | null = null;
  selectedCountryCode = '';
  cityFilter = '';

  categoryOptions: { label: string; value: number | null }[] = [];
  countryOptions: { label: string; value: string }[] = [];

  private rawCategories: DonationCategoryBackend[] = [];
  private countries: CountryLookup[] = [];
  private categoryLabelById: Record<number, string> = {};
  private countryLabelByCode: Record<string, string> = {};
  private skeletonRows: DonationRequestBackend[] = this.createSkeletonRows();
  private subscriptions: Subscription[] = [];

  constructor(
    private vendorOffersService: VendorOffersService,
    private donationReferenceService: DonationReferenceService,
    private localStorageService: LocalStorageService,
    private lookupService: PublicLookupService,
    private languageDirService: LanguageDirService,
    private translate: TranslationService,
    private messageService: MessageService,
    private router: Router,
  ) { }

  ngOnInit(): void {
    this.subscriptions.push(
      this.languageDirService.userLanguageCode$.subscribe(() => {
        this.buildCategoryMaps();
        this.buildCategoryOptions();
        this.buildCountryOptions();
        this.buildCountryMaps();
      }),
    );
    this.loadLookups();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  get tableValue(): DonationRequestBackend[] {
    if (this.tableLoadingSpinner && this.requests.length === 0) {
      return this.skeletonRows;
    }
    return this.requests;
  }

  onPageChange(event: any): void {
    const first = event?.first ?? 0;
    const rows = event?.rows ?? this.rows;

    setTimeout(() => {
      this.first = first;
      this.rows = rows;
      this.skeletonRows = this.createSkeletonRows();
      this.loadRequests();
    });
  }

  onFiltersApply(): void {
    this.first = 0;
    this.loadRequests();
  }

  onFiltersReset(): void {
    this.selectedCategoryId = null;
    this.selectedCountryCode = '';
    this.cityFilter = '';
    this.first = 0;
    this.loadRequests();
  }

  viewDetails(row: DonationRequestBackend, event?: Event): void {
    event?.stopPropagation();
    if (this.tableLoadingSpinner || !row.Donation_Request_ID) {
      return;
    }
    this.router.navigate(['/donations/vendor/requests', row.Donation_Request_ID]);
  }

  getTitle(row: DonationRequestBackend): string {
    return this.localStorageService.pickRequestContentField(
      String(row.Title || ''),
      String(row.Title_Regional || ''),
    );
  }

  getCategoryLabel(row: DonationRequestBackend): string {
    const categoryId = Number(row.Donation_Category_ID || 0);
    return this.categoryLabelById[categoryId] || '-';
  }

  getQuantityLabel(row: DonationRequestBackend): string {
    if (!row.Quantity) {
      return '-';
    }
    return `${row.Quantity} ${row.Unit || ''}`.trim();
  }

  getLocationLabel(row: DonationRequestBackend): string {
    const city = String(row.City || '').trim();
    const country = this.getCountryLabel(row);
    if (city && country !== '-') {
      return `${city}, ${country}`;
    }
    return city || country;
  }

  getCountryLabel(row: DonationRequestBackend): string {
    const code = String(row.Country_Code || '').trim().toUpperCase();
    if (!code) {
      return '-';
    }
    return this.countryLabelByCode[code] || code;
  }

  getNeedsInstallationLabel(row: DonationRequestBackend): string {
    if (row.Needs_Installation === undefined || row.Needs_Installation === null) {
      return '-';
    }
    return row.Needs_Installation
      ? this.translate.getInstant('donations.browse.yes')
      : this.translate.getInstant('donations.browse.no');
  }

  formatEstimatedCost(row: DonationRequestBackend): string {
    if (!row.Estimated_Cost) {
      return '-';
    }
    return `${row.Estimated_Cost} ${row.Currency_Code || ''}`.trim();
  }

  // #region Load data

  private loadLookups(): void {
    const sub = forkJoin({
      types: this.donationReferenceService.listDonationTypes(),
      countries: this.lookupService.getCountries(),
    }).subscribe({
      next: (results) => {
        this.countries = this.lookupService.sortCountriesByLabel(
          results.countries,
          this.localStorageService.isArabicUi(),
        );
        this.buildCountryMaps();
        this.buildCountryOptions();

        if (!results.types?.success) {
          this.initialLoading = false;
          return;
        }

        const mappedTypes = this.donationReferenceService.mapDonationTypes(
          this.donationReferenceService.parseListFromResponse<DonationTypeBackend>(results.types),
        );

        if (!mappedTypes.length) {
          this.initialLoading = false;
          return;
        }

        const categorySub = forkJoin(
          mappedTypes.map((type) => this.donationReferenceService.listDonationCategories(type.id, true)),
        ).subscribe({
          next: (categoryResponses) => {
            console.log('vendorRequests categoryResponses', categoryResponses);
            this.rawCategories = [];
            categoryResponses.forEach((response: any) => {
              if (!response?.success) {
                return;
              }
              this.rawCategories.push(
                ...this.donationReferenceService.parseListFromResponse<DonationCategoryBackend>(response),
              );
            });
            this.buildCategoryMaps();
            this.buildCategoryOptions();
            this.initialLoading = false;
          },
          error: () => {
            this.initialLoading = false;
          },
        });
        this.subscriptions.push(categorySub);
      },
      error: () => {
        this.initialLoading = false;
      },
    });
    this.subscriptions.push(sub);
  }

  private loadRequests(): void {
    this.tableLoadingSpinner = true;
    const currentPage = Math.floor(this.first / this.rows) + 1;
    const lastRequestId = -currentPage;
    const categoryFilter = this.selectedCategoryId ? [this.selectedCategoryId] : [];

    const sub = this.vendorOffersService
      .listRequestsForVendor(
        categoryFilter,
        String(this.selectedCountryCode || '').trim().toUpperCase(),
        String(this.cityFilter || '').trim(),
        lastRequestId,
        this.rows,
      )
      .subscribe({
        next: (response: any) => {
          console.log('listRequestsForVendor response', response);
          if (!response?.success) {
            this.handleBusinessError('list', response);
            return;
          }
          this.totalRecords = Number(response.message.Total_Count);
          this.requests = response.message.Donation_Requests;
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

  private buildCategoryMaps(): void {
    this.categoryLabelById = {};
    for (const item of this.donationReferenceService.mapDonationCategories(this.rawCategories)) {
      if (!item.id) {
        continue;
      }
      this.categoryLabelById[item.id] = item.name;
    }
  }

  private buildCategoryOptions(): void {
    this.categoryOptions = [
      { label: this.translate.getInstant('donations.vendorOffers.filters.allCategories'), value: null },
      ...this.donationReferenceService.mapDonationCategories(this.rawCategories).map((item) => ({
        label: item.name,
        value: item.id,
      })),
    ];
  }

  private buildCountryOptions(): void {
    this.countryOptions = [
      { label: this.translate.getInstant('donations.vendorOffers.filters.allCountries'), value: '' },
      ...this.countries.map((item) => ({
        label: this.lookupService.getCountryLabel(item, this.localStorageService.isArabicUi()),
        value: String(item.code || '').trim().toUpperCase(),
      })),
    ];
  }

  private buildCountryMaps(): void {
    this.countryLabelByCode = {};
    const isArabic = this.localStorageService.isArabicUi();
    for (const item of this.countries) {
      const code = String(item.code || '').trim().toUpperCase();
      if (!code) {
        continue;
      }
      this.countryLabelByCode[code] = this.lookupService.getCountryLabel(item, isArabic);
    }
  }

  private createSkeletonRows(): DonationRequestBackend[] {
    return Array(this.rows).fill(null).map(() => ({}));
  }

  private handleBusinessError(context: VendorRequestsListContext, response: any): void {
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
      case 'DAP13000':
        return this.translate.getInstant('donations.vendorOffers.errors.requestNotFound');
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
