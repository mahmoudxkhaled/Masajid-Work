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
import {
  DonationRequestStatusBackend,
  DonationRequestStatusId,
  getDonationRequestStatusLabelKey,
} from '../../../models/donation-request-status.model';
import { DonationTypeBackend } from '../../../models/donation-type.model';
import { DonationReferenceService } from '../../../services/donation-reference.service';
import { DonationRequestsService } from '../../services/donation-requests.service';

type FacilityFulfillmentsListContext = 'list';

@Component({
  standalone: false,
  selector: 'app-facility-fulfillments-list',
  templateUrl: './facility-fulfillments-list.component.html',
  styleUrl: './facility-fulfillments-list.component.scss',
})
export class FacilityFulfillmentsListComponent implements OnInit, OnDestroy {
  rows = 10;
  readonly rowsPerPageOptions = [10, 25, 50, 100];

  requests: DonationRequestBackend[] = [];
  textFilter = '';
  first = 0;
  totalRecords = 0;
  tableLoadingSpinner = false;
  initialLoading = true;

  private statuses: DonationRequestStatusBackend[] = [];
  private rawCategories: DonationCategoryBackend[] = [];
  private countries: CountryLookup[] = [];
  private statusLabelById: Record<number, string> = {};
  private statusCodeById: Record<number, string> = {};
  private categoryLabelById: Record<number, string> = {};
  private countryLabelByCode: Record<string, string> = {};
  private searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private subscriptions: Subscription[] = [];

  constructor(
    private donationRequestsService: DonationRequestsService,
    private donationReferenceService: DonationReferenceService,
    private localStorageService: LocalStorageService,
    private lookupService: PublicLookupService,
    private languageDirService: LanguageDirService,
    private translate: TranslationService,
    private messageService: MessageService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.subscriptions.push(
      this.languageDirService.userLanguageCode$.subscribe(() => {
        this.buildStatusMaps();
        this.buildCategoryMaps();
        this.buildCountryMaps();
      }),
    );
    this.loadStatuses();
    this.loadLookups();
  }

  ngOnDestroy(): void {
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  get tableValue(): DonationRequestBackend[] {
    if (this.tableLoadingSpinner && this.requests.length === 0) {
      return Array(this.rows)
        .fill(null)
        .map(() => ({}));
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

  viewFulfillment(row: DonationRequestBackend, event?: Event): void {
    event?.stopPropagation();
    if (this.tableLoadingSpinner || !row.Donation_Request_ID) {
      return;
    }
    this.router.navigate(['/donations/facility/fulfillments', row.Donation_Request_ID]);
  }

  getTitle(row: DonationRequestBackend): string {
    return this.localStorageService.pickRequestContentField(
      String(row.Title || ''),
      String(row.Title_Regional || ''),
    );
  }

  getStatusLabel(statusId: number): string {
    return (
      this.statusLabelById[statusId] ||
      this.translate.getInstant(getDonationRequestStatusLabelKey(statusId))
    );
  }

  getStatusSeverity(
    statusId: number,
  ): 'success' | 'info' | 'warning' | 'danger' | 'secondary' | 'contrast' {
    const code = this.statusCodeById[statusId] || '';
    switch (String(code).toUpperCase()) {
      case 'FULFILLMENT_SUBMITTED':
      case 'IN_FULFILLMENT':
      case 'OPEN_FOR_VALIDATION':
        return 'info';
      case 'REJECTED':
      case 'CANCELLED':
        return 'danger';
      default:
        return 'info';
    }
  }

  formatEstimatedCost(row: DonationRequestBackend): string {
    if (!row.Estimated_Cost) {
      return '-';
    }
    return `${row.Estimated_Cost} ${row.Currency_Code || ''}`.trim();
  }

  formatQuantity(row: DonationRequestBackend): string {
    const quantity = row.Quantity;
    const unit = String(row.Unit || '').trim();
    if (quantity == null && !unit) {
      return '-';
    }
    if (quantity == null) {
      return unit || '-';
    }
    return unit ? `${quantity} ${unit}` : String(quantity);
  }

  getCategoryLabel(row: DonationRequestBackend): string {
    const categoryId = Number(row.Donation_Category_ID || 0);
    return this.categoryLabelById[categoryId] || '-';
  }

  getLocationLabel(row: DonationRequestBackend): string {
    const city = this.localStorageService.pickRequestContentField(
      String(row.City || ''),
      String((row as any).City_Regional || ''),
    );
    const country = this.getCountryLabel(row);
    if (city && country && country !== '-') {
      return `${city} / ${country}`;
    }
    return city || country || '-';
  }

  getCountryLabel(row: DonationRequestBackend): string {
    const code = String(row.Country_Code || '').trim().toUpperCase();
    if (!code) {
      return '-';
    }
    return this.countryLabelByCode[code] || code;
  }

  // #region Load data
  private loadLookups(): void {
    const sub = forkJoin({
      types: this.donationReferenceService.listDonationTypes(),
      countries: this.lookupService.getCountries(),
    }).subscribe({
      next: (results) => {
        console.log('facility fulfillments listLookups response', results);
        this.countries = this.lookupService.sortCountriesByLabel(
          results.countries,
          this.localStorageService.isArabicUi(),
        );
        this.buildCountryMaps();

        if (!results.types?.success) {
          return;
        }

        const rawTypes = Object.values(results.types.message ?? {}) as DonationTypeBackend[];
        const mappedTypes = this.donationReferenceService.mapDonationTypes(rawTypes);
        if (!mappedTypes.length) {
          this.buildCategoryMaps();
          return;
        }

        const categorySub = forkJoin(
          mappedTypes.map((type) => this.donationReferenceService.listDonationCategories(type.id, false)),
        ).subscribe({
          next: (categoryResponses) => {
            console.log('facility fulfillments listCategories response', categoryResponses);
            this.rawCategories = [];
            categoryResponses.forEach((response: any) => {
              if (response?.success) {
                this.rawCategories.push(
                  ...(Object.values(response.message ?? {}) as DonationCategoryBackend[]),
                );
              }
            });
            this.buildCategoryMaps();
          },
        });
        this.subscriptions.push(categorySub);
      },
    });
    this.subscriptions.push(sub);
  }

  private loadStatuses(): void {
    const sub = this.donationReferenceService.listDonationRequestStatuses().subscribe({
      next: (response: any) => {
        console.log('facility fulfillments statuses response', response);
        if (!response?.success) {
          return;
        }
        this.statuses = Object.values(response.message ?? {});
        this.buildStatusMaps();
      },
    });
    this.subscriptions.push(sub);
  }

  private loadRequests(): void {
    const entityId = Number(this.localStorageService.getEntityId() || 0);
    if (!entityId) {
      this.requests = [];
      this.totalRecords = 0;
      this.initialLoading = false;
      this.tableLoadingSpinner = false;
      return;
    }

    this.tableLoadingSpinner = true;
    const currentPage = Math.floor(this.first / this.rows) + 1;
    const lastRequestId = -currentPage;

    const sub = this.donationRequestsService
      .listEntityDonationRequests({
        entityId,
        statusFilter: [DonationRequestStatusId.FulfillmentSubmitted],
        lastRequestId,
        filterCount: this.rows,
        textFilter: this.textFilter,
      })
      .subscribe({
        next: (response: any) => {
          console.log('listEntityDonationRequests fulfillmentSubmitted response', response);
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

  private buildStatusMaps(): void {
    this.statusLabelById = {};
    this.statusCodeById = {};

    for (const item of this.statuses) {
      const id = Number(item.Donation_Request_Status_ID || 0);
      if (!id) {
        continue;
      }
      this.statusLabelById[id] = this.localStorageService.pickLocalizedField(
        String(item.Name || ''),
        String(item.Name_Regional || ''),
      );
      this.statusCodeById[id] = String(item.Code || '');
    }
  }

  private buildCategoryMaps(): void {
    this.categoryLabelById = {};
    const mappedCategories = this.donationReferenceService.mapDonationCategories(this.rawCategories);
    for (const item of mappedCategories) {
      if (!item.id) {
        continue;
      }
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

  private handleBusinessError(context: FacilityFulfillmentsListContext, response: any): void {
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
      case 'DAP13013':
        return this.translate.getInstant('donations.facility.fulfillments.errors.notOwnerFacility');
      case 'DAP11055':
        return this.translate.getInstant('donations.facility.fulfillments.errors.accessDenied');
      case 'DAP11040':
      case 'DAP11041':
      case 'DAP11042':
        return this.translate.getInstant('donations.facility.fulfillments.errors.sessionExpired');
      default:
        return null;
    }
  }
}
