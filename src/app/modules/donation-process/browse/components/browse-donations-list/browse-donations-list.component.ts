import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Subscription, forkJoin } from 'rxjs';
import { CountryLookup } from 'src/app/core/models/lookup.model';
import { LanguageDirService } from 'src/app/core/services/language-dir.service';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';
import { PublicLookupService } from 'src/app/core/services/public-lookup.service';
import { TranslationService } from 'src/app/core/services/translation.service';
import {
  BrowseDonationRequestsFilter,
  DonationBrowseFilterForm,
  DonationRequestBackend,
} from '../../../models/donation-request.model';
import { DonationCategoryBackend } from '../../../models/donation-category.model';
import { DonationTypeBackend } from '../../../models/donation-type.model';
import { DonationReferenceService } from '../../../services/donation-reference.service';
import { DonationBrowseService } from '../../services/donation-browse.service';

type BrowseDonationsListContext = 'list';

@Component({
  standalone: false,
  selector: 'app-browse-donations-list',
  templateUrl: './browse-donations-list.component.html',
  styleUrl: './browse-donations-list.component.scss',
})
export class BrowseDonationsListComponent implements OnInit, OnDestroy {
  rows = 10;
  readonly rowsPerPageOptions = [10, 25, 50, 100];

  requests: DonationRequestBackend[] = [];
  first = 0;
  totalRecords = 0;
  tableLoadingSpinner = true;
  initialLoading = true;

  filters: DonationBrowseFilterForm = this.createDefaultFilters();
  typeOptions: { label: string; value: number | null }[] = [];
  categoryOptions: { label: string; value: number | null }[] = [];
  countryOptions: { label: string; value: string }[] = [];
  sortOptions: { label: string; value: number }[] = [];

  private rawTypes: DonationTypeBackend[] = [];
  private rawCategories: DonationCategoryBackend[] = [];
  private categoriesByTypeId: Record<number, DonationCategoryBackend[]> = {};
  private countries: CountryLookup[] = [];
  private categoryLabelById: Record<number, string> = {};
  private countryLabelByCode: Record<string, string> = {};
  private subscriptions: Subscription[] = [];

  constructor(
    private donationBrowseService: DonationBrowseService,
    private donationReferenceService: DonationReferenceService,
    private localStorageService: LocalStorageService,
    private lookupService: PublicLookupService,
    private languageDirService: LanguageDirService,
    private translate: TranslationService,
    private messageService: MessageService,
    private router: Router,
  ) { }

  ngOnInit(): void {
    this.buildSortOptions();
    this.subscriptions.push(
      this.languageDirService.userLanguageCode$.subscribe(() => {
        this.buildSortOptions();
        this.buildTypeOptions();
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
      return Array(this.rows).fill(null).map(() => ({}));
    }
    return this.requests;
  }

  onPageChange(event: any): void {
    this.first = event?.first ?? 0;
    this.rows = event?.rows ?? this.rows;
    this.loadRequests();
  }

  onFiltersApply(form: DonationBrowseFilterForm): void {
    this.filters = { ...form };
    this.buildCategoryOptions();
    this.first = 0;
    this.loadRequests();
  }

  onFiltersReset(): void {
    this.filters = this.createDefaultFilters();
    this.buildCategoryOptions();
    this.first = 0;
    this.loadRequests();
  }

  onCategoryOptionsTypeChange(typeId: number | null): void {
    this.buildCategoryOptions(typeId);
  }

  viewRequest(row: DonationRequestBackend, event?: Event): void {
    event?.stopPropagation();
    if (this.tableLoadingSpinner || !row.Donation_Request_ID) {
      return;
    }
    this.router.navigate(['/donations/browse', row.Donation_Request_ID]);
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

        const rawTypes = this.donationReferenceService.parseListFromResponse<DonationTypeBackend>(results.types);
        this.rawTypes = rawTypes;
        this.buildTypeOptions();
        const mappedTypes = this.donationReferenceService.mapDonationTypes(rawTypes);

        if (!mappedTypes.length) {
          this.buildCategoryMaps();
          this.initialLoading = false;
          return;
        }

        const categorySub = forkJoin(
          mappedTypes.map((type) => this.donationReferenceService.listDonationCategories(type.id, false)),
        ).subscribe({
          next: (categoryResponses) => {
            console.log('browse categoryResponses', categoryResponses);
            this.rawCategories = [];
            this.categoriesByTypeId = {};
            categoryResponses.forEach((response: any, index) => {
              if (!response?.success) {
                return;
              }
              const typeId = mappedTypes[index]?.id || 0;
              const items = this.donationReferenceService.parseListFromResponse<DonationCategoryBackend>(response);
              const stampedItems = items.map((item) => ({
                ...item,
                Donation_Type_ID: Number(item.Donation_Type_ID || typeId),
              }));
              this.rawCategories.push(...stampedItems);
              this.categoriesByTypeId[typeId] = stampedItems;
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
    const filter = this.buildApiFilter(-currentPage);

    const sub = this.donationBrowseService.browseDonationRequests(filter).subscribe({
      next: (response: any) => {
        console.log('browseDonationRequests response', response);
        if (!response?.success) {
          this.handleBusinessError('list', response);
          return;
        }
        this.totalRecords = Number(response.message?.Total_Count || 0);
        this.requests = response.message?.Donation_Requests ?? [];
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

  private buildApiFilter(lastRequestId: number): BrowseDonationRequestsFilter {
    const categoryFilter = this.filters.donationCategoryId ? [this.filters.donationCategoryId] : [];
    const hasLocation =
      this.filters.latitude !== null &&
      this.filters.longitude !== null &&
      Number(this.filters.latitude) !== 0 &&
      Number(this.filters.longitude) !== 0;

    return {
      categoryFilter,
      latitude: hasLocation ? Number(this.filters.latitude) : 0,
      longitude: hasLocation ? Number(this.filters.longitude) : 0,
      radiusKm: 0,
      maxEstimatedCost: Number(this.filters.maxEstimatedCost || 0),
      countryCode: String(this.filters.countryCode || '').trim().toUpperCase(),
      city: String(this.filters.city || '').trim(),
      sortBy: Number(this.filters.sortBy || 0),
      lastRequestId,
      filterCount: this.rows,
    };
  }

  private createDefaultFilters(): DonationBrowseFilterForm {
    return {
      donationTypeId: null,
      donationCategoryId: null,
      countryCode: '',
      city: '',
      latitude: null,
      longitude: null,
      maxEstimatedCost: null,
      sortBy: 0,
    };
  }

  private buildSortOptions(): void {
    this.sortOptions = [
      { label: this.translate.getInstant('donations.browse.sortOptions.default'), value: 0 },
      { label: this.translate.getInstant('donations.browse.sortOptions.costAsc'), value: 1 },
      { label: this.translate.getInstant('donations.browse.sortOptions.costDesc'), value: 2 },
    ];
  }

  private buildTypeOptions(): void {
    this.typeOptions = this.donationReferenceService.mapDonationTypes(this.rawTypes).map((type) => ({
      label: type.name,
      value: type.id,
    }));
  }

  private buildCategoryOptions(typeId?: number | null): void {
    const resolvedTypeId =
      typeId !== undefined ? Number(typeId || 0) : Number(this.filters.donationTypeId || 0);
    if (!resolvedTypeId) {
      this.categoryOptions = [];
      return;
    }

    const categories = this.categoriesByTypeId[resolvedTypeId] || [];
    this.categoryOptions = this.donationReferenceService.mapDonationCategories(categories).map((item) => ({
      label: item.name,
      value: item.id,
    }));
  }

  private buildCountryOptions(): void {
    const isArabic = this.localStorageService.isArabicUi();
    this.countryOptions = this.countries.map((item) => ({
      label: this.lookupService.getCountryLabel(item, isArabic),
      value: item.code,
    }));
  }

  private buildCategoryMaps(): void {
    this.categoryLabelById = {};
    for (const item of this.donationReferenceService.mapDonationCategories(this.rawCategories)) {
      this.categoryLabelById[item.id] = item.name;
    }
  }

  private buildCountryMaps(): void {
    const isArabic = this.localStorageService.isArabicUi();
    this.countryLabelByCode = {};
    for (const item of this.countries) {
      const code = String(item.code || '').trim().toUpperCase();
      if (!code) {
        continue;
      }
      this.countryLabelByCode[code] = this.lookupService.getCountryLabel(item, isArabic);
    }
  }

  private handleBusinessError(context: BrowseDonationsListContext, response: any): void {
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
      case 'DAP13001':
        return this.translate.getInstant('donations.browse.errors.invalidCategory');
      case 'DAP13002':
        return this.translate.getInstant('donations.browse.errors.invalidType');
      case 'DAP13021':
        return this.translate.getInstant('donations.browse.errors.invalidCurrency');
      case 'DAP13022':
        return this.translate.getInstant('donations.browse.errors.invalidCountry');
      case 'DAP11055':
        return this.translate.getInstant('donations.browse.errors.accessDenied');
      case 'DAP11040':
      case 'DAP11041':
      case 'DAP11042':
        return this.translate.getInstant('donations.browse.errors.sessionExpired');
      default:
        return null;
    }
  }
}
