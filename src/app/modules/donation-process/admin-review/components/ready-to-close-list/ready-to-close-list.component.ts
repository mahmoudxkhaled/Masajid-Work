import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Subscription, forkJoin } from 'rxjs';
import { CountryLookup } from 'src/app/core/models/lookup.model';
import { Roles } from 'src/app/core/models/system-roles';
import { LanguageDirService } from 'src/app/core/services/language-dir.service';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';
import { PermissionService } from 'src/app/core/services/permission.service';
import { PublicLookupService } from 'src/app/core/services/public-lookup.service';
import { TranslationService } from 'src/app/core/services/translation.service';
import { DonationRequestsService } from '../../../facility-requests/services/donation-requests.service';
import { DonationCategoryBackend } from '../../../models/donation-category.model';
import { DonationRequestBackend } from '../../../models/donation-request.model';
import {
  DonationRequestStatusId,
  getDonationRequestStatusLabelKey,
} from '../../../models/donation-request-status.model';
import { DonationTypeBackend } from '../../../models/donation-type.model';
import { DonationReferenceService } from '../../../services/donation-reference.service';

type ReadyToCloseListContext = 'list';

@Component({
  standalone: false,
  selector: 'app-ready-to-close-list',
  templateUrl: './ready-to-close-list.component.html',
  styleUrl: './ready-to-close-list.component.scss',
})
export class ReadyToCloseListComponent implements OnInit, OnDestroy {
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
    private donationRequestsService: DonationRequestsService,
    private donationReferenceService: DonationReferenceService,
    private permissionService: PermissionService,
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

  viewDetails(row: DonationRequestBackend, event?: Event): void {
    event?.stopPropagation();
    if (this.tableLoadingSpinner || !row.Donation_Request_ID) {
      return;
    }
    this.router.navigate(['/donations/admin/ready-to-close', row.Donation_Request_ID]);
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
      return `${city} / ${country}`;
    }
    return city || country || '-';
  }

  getCountryLabel(row: DonationRequestBackend): string {
    const code = String(row.Country_Code || '')
      .trim()
      .toUpperCase();
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

  getStatusLabel(row: DonationRequestBackend): string {
    const statusId = Number(row.Donation_Request_Status_ID || 0);
    return this.translate.getInstant(getDonationRequestStatusLabelKey(statusId));
  }

  getStatusSeverity(
    row: DonationRequestBackend,
  ): 'success' | 'info' | 'warning' | 'danger' | 'secondary' | 'contrast' {
    const statusId = Number(row.Donation_Request_Status_ID || 0);
    if (statusId === DonationRequestStatusId.Validated) {
      return 'success';
    }
    if (statusId === DonationRequestStatusId.Closed) {
      return 'secondary';
    }
    return 'info';
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

        const rawTypes = this.donationReferenceService.parseListFromResponse<DonationTypeBackend>(
          results.types,
        );
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
    const canListGlobally = this.permissionService.hasAnyRole([
      Roles.Developer,
      Roles.SystemAdministrator,
    ]);
    const entityId = canListGlobally
      ? 0
      : Number(this.localStorageService.getEntityId() || 0);
    if (!canListGlobally && !entityId) {
      this.requests = [];
      this.totalRecords = 0;
      this.tableLoadingSpinner = false;
      this.initialLoading = false;
      return;
    }

    this.tableLoadingSpinner = true;
    const currentPage = Math.floor(this.first / this.rows) + 1;
    const lastRequestId = -currentPage;

    const sub = this.donationRequestsService
      .listEntityDonationRequests({
        entityId,
        statusFilter: [DonationRequestStatusId.Validated],
        lastRequestId,
        filterCount: this.rows,
        textFilter: this.textFilter,
      })
      .subscribe({
        next: (response: any) => {
          console.log('listEntityDonationRequests ready-to-close response', response);
          if (!response?.success) {
            this.handleBusinessError('list', response);
            return;
          }
          this.totalRecords = Number(response.message.Total_Count);
          this.requests = response.message.Donation_Requests;
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
      const code = String(item.code || '')
        .trim()
        .toUpperCase();
      if (!code) {
        continue;
      }
      this.countryLabelByCode[code] = this.lookupService.getCountryLabel(item, isArabic);
    }
  }

  private handleBusinessError(context: ReadyToCloseListContext, response: any): void {
    const code = String(response?.message || '');
    let detail: string | null = null;

    switch (context) {
      case 'list':
        detail = this.getListErrorMessage(code);
        this.tableLoadingSpinner = false;
        this.initialLoading = false;
        this.requests = [];
        this.totalRecords = 0;
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
        return this.translate.getInstant('donations.adminClose.errors.notOwnerFacility');
      case 'DAP11055':
        return this.translate.getInstant('donations.adminClose.errors.accessDenied');
      case 'DAP11040':
      case 'DAP11041':
      case 'DAP11042':
        return this.translate.getInstant('donations.adminClose.errors.sessionExpired');
      default:
        return null;
    }
  }
}
