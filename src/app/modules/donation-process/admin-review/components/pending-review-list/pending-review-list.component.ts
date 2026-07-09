import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Subscription, forkJoin } from 'rxjs';
import { LanguageDirService } from 'src/app/core/services/language-dir.service';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';
import { PublicLookupService } from 'src/app/core/services/public-lookup.service';
import { TranslationService } from 'src/app/core/services/translation.service';
import { CountryLookup } from 'src/app/core/models/lookup.model';
import { DonationRequestBackend } from '../../../models/donation-request.model';
import { DonationCategoryBackend } from '../../../models/donation-category.model';
import { DonationTypeBackend } from '../../../models/donation-type.model';
import { DonationReferenceService } from '../../../services/donation-reference.service';
import { DonationAdminService } from '../../services/donation-admin.service';

type PendingReviewListContext = 'list';

@Component({
  standalone: false,
  selector: 'app-pending-review-list',
  templateUrl: './pending-review-list.component.html',
  styleUrl: './pending-review-list.component.scss',
})
export class PendingReviewListComponent implements OnInit, OnDestroy {
  rows = 10;
  readonly rowsPerPageOptions = [10, 25, 50, 100];

  requests: DonationRequestBackend[] = [];
  textFilter = '';
  first = 0;
  totalRecords = 0;
  tableLoadingSpinner = true;
  initialLoading = true;

  private rawCategories: DonationCategoryBackend[] = [];
  private countries: CountryLookup[] = [];
  private categoryLabelById: Record<number, string> = {};
  private countryLabelByCode: Record<string, string> = {};
  private searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private subscriptions: Subscription[] = [];

  constructor(
    private donationAdminService: DonationAdminService,
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
        this.buildCountryMaps();
      }),
    );
    this.loadLookups();
    this.loadRequests();
  }

  ngOnDestroy(): void {
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }
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

  onSearchInput(value: string): void {
    this.textFilter = value;
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }
    this.searchDebounceTimer = setTimeout(() => {
      this.first = 0;
      this.loadRequests();
    }, 300);
  }

  reviewRequest(row: DonationRequestBackend, event?: Event): void {
    event?.stopPropagation();
    if (this.tableLoadingSpinner || !row.Donation_Request_ID) {
      return;
    }
    this.router.navigate(['/donations/admin/pending-review', row.Donation_Request_ID]);
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

  getCountryLabel(row: DonationRequestBackend): string {
    const code = String(row.Country_Code || '').trim().toUpperCase();
    if (!code) {
      return '-';
    }
    return this.countryLabelByCode[code] || code;
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

        if (!results.types?.success) {
          return;
        }

        const rawTypes = this.donationReferenceService.parseListFromResponse<DonationTypeBackend>(results.types);
        const mappedTypes = this.donationReferenceService.mapDonationTypes(rawTypes);
        if (!mappedTypes.length) {
          this.buildCategoryMaps();
          return;
        }

        const categorySub = forkJoin(
          mappedTypes.map((type) => this.donationReferenceService.listDonationCategories(type.id, false)),
        ).subscribe({
          next: (categoryResponses) => {
            console.log('categoryResponses', categoryResponses);
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
          },
        });
        this.subscriptions.push(categorySub);
      },
    });
    this.subscriptions.push(sub);
  }

  private loadRequests(): void {
    this.tableLoadingSpinner = true;
    const currentPage = Math.floor(this.first / this.rows) + 1;
    const lastRequestId = -currentPage;

    const sub = this.donationAdminService
      .listPendingReviewRequests(lastRequestId, this.rows, this.textFilter)
      .subscribe({
        next: (response: any) => {
          console.log('listPendingReviewRequests response', response);
          if (!response?.success) {
            this.handleBusinessError('list', response);
            return;
          }
          this.totalRecords = Number(response.message?.Total_Count || 0);
          this.requests = response.message?.Donation_Requests ?? [];
        },
        error: () => {
          this.tableLoadingSpinner = false;
          this.initialLoading = false;
        },
        complete: () => {
          this.tableLoadingSpinner = false;
          this.initialLoading = false;
        },
      });
    this.subscriptions.push(sub);
  }

  // #endregion

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

  private handleBusinessError(context: PendingReviewListContext, response: any): void {
    const code = String(response?.message || '');
    let detail: string | null = null;

    switch (context) {
      case 'list':
        detail = this.getListErrorMessage(code);
        this.tableLoadingSpinner = false;
        this.initialLoading = false;
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
      case 'DAP11055':
        return this.translate.getInstant('donations.adminReview.errors.accessDenied');
      case 'DAP11040':
      case 'DAP11041':
      case 'DAP11042':
        return this.translate.getInstant('donations.adminReview.errors.sessionExpired');
      default:
        return null;
    }
  }
}
