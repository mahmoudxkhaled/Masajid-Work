import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ConfirmationService, MenuItem, MessageService } from 'primeng/api';
import { Subscription, forkJoin } from 'rxjs';
import { CountryLookup } from 'src/app/core/models/lookup.model';
import { LanguageDirService } from 'src/app/core/services/language-dir.service';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';
import { PublicLookupService } from 'src/app/core/services/public-lookup.service';
import { TranslationService } from 'src/app/core/services/translation.service';
import { DonationRequestBackend } from '../../../models/donation-request.model';
import { DonationCategoryBackend } from '../../../models/donation-category.model';
import { DonationRequestStatusBackend } from '../../../models/donation-request-status.model';
import { DonationTypeBackend } from '../../../models/donation-type.model';
import { DonationReferenceService } from '../../../services/donation-reference.service';
import { DonationRequestsService } from '../../services/donation-requests.service';

type FacilityRequestsListContext = 'list' | 'submit' | 'delete';

@Component({
  standalone: false,
  selector: 'app-facility-requests-list',
  templateUrl: './facility-requests-list.component.html',
  styleUrl: './facility-requests-list.component.scss',
})
export class FacilityRequestsListComponent implements OnInit, OnDestroy {
  rows = 10;
  readonly rowsPerPageOptions = [10, 25, 50, 100];

  requests: DonationRequestBackend[] = [];
  statusOptions: { label: string; value: number | null }[] = [];
  selectedStatusId: number | null = null;
  textFilter = '';

  first = 0;
  totalRecords = 0;
  tableLoadingSpinner = false;
  initialLoading = true;

  menuItems: MenuItem[] = [];

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
    private confirmationService: ConfirmationService,
    private router: Router,
  ) { }

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

  onStatusFilterChange(): void {
    this.first = 0;
    this.loadRequests();
  }

  goToCreate(): void {
    this.router.navigate(['/donations/facility/requests/create']);
  }

  viewRequest(row: DonationRequestBackend, event?: Event): void {
    event?.stopPropagation();
    if (this.tableLoadingSpinner || !row.Donation_Request_ID) {
      return;
    }
    this.router.navigate(['/donations/facility/requests', row.Donation_Request_ID]);
  }

  editRequest(row: DonationRequestBackend, event?: Event): void {
    event?.stopPropagation();
    if (this.tableLoadingSpinner || !row.Donation_Request_ID) {
      return;
    }
    this.router.navigate(['/donations/facility/requests', row.Donation_Request_ID, 'edit']);
  }

  openMenu(menuRef: any, row: DonationRequestBackend, event: Event): void {
    event.stopPropagation();
    this.menuItems = this.getMenuItemsForRow(row);
    menuRef.toggle(event);
  }

  getMenuItemsForRow(row: DonationRequestBackend): MenuItem[] {
    const items: MenuItem[] = [
      {
        label: this.translate.getInstant('donations.facility.requests.actions.view'),
        icon: 'pi pi-eye',
        command: () => this.viewRequest(row),
      },
    ];

    if (this.isDraft(row)) {
      items.push(
        {
          label: this.translate.getInstant('donations.facility.requests.actions.edit'),
          icon: 'pi pi-pencil',
          command: () => this.editRequest(row),
        },
        {
          label: this.translate.getInstant('donations.facility.requests.actions.submit'),
          icon: 'pi pi-send',
          command: () => this.confirmSubmit(row),
        },
        {
          label: this.translate.getInstant('donations.facility.requests.actions.delete'),
          icon: 'pi pi-trash',
          command: () => this.confirmDelete(row),
        },
      );
    }

    return items;
  }

  confirmSubmit(row: DonationRequestBackend, event?: Event): void {
    event?.stopPropagation();
    this.confirmationService.confirm({
      message: this.translate.getInstant('donations.facility.requests.confirm.submitMessage'),
      header: this.translate.getInstant('donations.facility.requests.confirm.submitTitle'),
      icon: 'pi pi-exclamation-triangle',
      accept: () => this.submitRequest(Number(row.Donation_Request_ID)),
    });
  }

  confirmDelete(row: DonationRequestBackend, event?: Event): void {
    event?.stopPropagation();
    this.confirmationService.confirm({
      message: this.translate.getInstant('donations.facility.requests.confirm.deleteMessage'),
      header: this.translate.getInstant('donations.facility.requests.confirm.deleteTitle'),
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.deleteRequest(Number(row.Donation_Request_ID)),
    });
  }

  getTitle(row: DonationRequestBackend): string {
    return this.localStorageService.pickRequestContentField(
      String(row.Title || ''),
      String(row.Title_Regional || ''),
    );
  }

  isDraft(row: DonationRequestBackend): boolean {
    return String(row.Status_Code || '').toUpperCase() === 'DRAFT';
  }

  getStatusLabel(statusId: number): string {
    return this.statusLabelById[statusId] || '';
  }

  getStatusSeverity(statusId: number): 'success' | 'info' | 'warning' | 'danger' | 'secondary' | 'contrast' {
    const code = this.statusCodeById[statusId] || '';
    switch (String(code).toUpperCase()) {
      case 'DRAFT':
        return 'secondary';
      case 'PENDING_REVIEW':
        return 'warning';
      case 'PUBLISHED':
      case 'ACCEPTED':
      case 'VALIDATED':
      case 'CLOSED':
        return 'success';
      case 'REJECTED':
      case 'CANCELLED':
        return 'danger';
      case 'IN_FULFILLMENT':
      case 'FULFILLMENT_SUBMITTED':
      case 'OPEN_FOR_VALIDATION':
        return 'info';
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

  getCategoryLabel(row: DonationRequestBackend): string {
    const categoryId = Number(row.Donation_Category_ID || 0);
    return this.categoryLabelById[categoryId] || '-';
  }

  getCountryLabel(row: DonationRequestBackend): string {
    const code = String(row.Country_Code || '').trim().toUpperCase();
    if (!code) {
      return '-';
    }
    return this.countryLabelByCode[code] || code;
  }

  private loadLookups(): void {
    const sub = forkJoin({
      types: this.donationReferenceService.listDonationTypes(),
      countries: this.lookupService.getCountries(),
    }).subscribe({
      next: (results) => {
        console.log('listLookups response', results);
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
            console.log('listCategories response', categoryResponses);
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
        console.log('statuses response', response);
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
      return;
    }

    this.tableLoadingSpinner = true;
    const currentPage = Math.floor(this.first / this.rows) + 1;
    const lastRequestId = -currentPage;
    const statusFilter = this.selectedStatusId ? [this.selectedStatusId] : [];

    const sub = this.donationRequestsService
      .listEntityDonationRequests({
        entityId,
        statusFilter,
        lastRequestId,
        filterCount: this.rows,
        textFilter: this.textFilter,
      })
      .subscribe({
        next: (response: any) => {
          console.log('loadRequests response', response);
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

  private submitRequest(requestId: number): void {
    const sub = this.donationRequestsService.submitDonationRequestForReview(requestId).subscribe({
      next: (response: any) => {
        if (!response?.success) {
          this.handleBusinessError('submit', response);
          return;
        }
        this.messageService.add({
          severity: 'success',
          summary: this.translate.getInstant('common.success'),
          detail: this.translate.getInstant('donations.facility.requests.messages.submitted'),
        });
        this.loadRequests();
      },
    });
    this.subscriptions.push(sub);
  }

  private deleteRequest(requestId: number): void {
    const sub = this.donationRequestsService.deleteDonationRequest(requestId).subscribe({
      next: (response: any) => {
        if (!response?.success) {
          this.handleBusinessError('delete', response);
          return;
        }
        this.messageService.add({
          severity: 'success',
          summary: this.translate.getInstant('common.success'),
          detail: this.translate.getInstant('donations.facility.requests.messages.deleted'),
        });
        this.loadRequests();
      },
    });
    this.subscriptions.push(sub);
  }

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

    this.statusOptions = [
      { label: this.translate.getInstant('donations.shared.filters.allStatuses'), value: null },
      ...this.statuses
        .filter((item) => Number(item.Donation_Request_Status_ID || 0) > 0)
        .map((item) => ({
          label: this.localStorageService.pickLocalizedField(
            String(item.Name || ''),
            String(item.Name_Regional || ''),
          ),
          value: Number(item.Donation_Request_Status_ID),
        })),
    ];
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

  private handleBusinessError(context: FacilityRequestsListContext, response: any): void {
    const code = String(response?.message || '');
    let detail: string | null = null;

    switch (context) {
      case 'list':
        detail = this.getListErrorMessage(code);
        this.tableLoadingSpinner = false;
        this.initialLoading = false;
        break;
      case 'submit':
        detail = this.getSubmitErrorMessage(code);
        break;
      case 'delete':
        detail = this.getDeleteErrorMessage(code);
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
        return this.translate.getInstant('donations.facility.requests.messages.notOwnerFacility');
      default:
        return null;
    }
  }

  private getSubmitErrorMessage(code: string): string | null {
    switch (code) {
      case 'DAP13000':
        return this.translate.getInstant('donations.facility.requests.errors.invalidRequestId');
      case 'DAP13010':
        return this.translate.getInstant('donations.facility.requests.errors.invalidStatusForAction');
      default:
        return null;
    }
  }

  private getDeleteErrorMessage(code: string): string | null {
    switch (code) {
      case 'DAP13000':
        return this.translate.getInstant('donations.facility.requests.errors.invalidRequestId');
      case 'DAP13031':
        return this.translate.getInstant('donations.facility.requests.errors.deleteNotDraft');
      default:
        return null;
    }
  }
}
