import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Subscription, forkJoin } from 'rxjs';
import { LanguageDirService } from 'src/app/core/services/language-dir.service';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';
import { TranslationService } from 'src/app/core/services/translation.service';
import { DonationCategoryBackend } from '../../../models/donation-category.model';
import { DonationRequestBackend } from '../../../models/donation-request.model';
import { DonationTypeBackend } from '../../../models/donation-type.model';
import { DonationReferenceService } from '../../../services/donation-reference.service';
import { DonationValidationService } from '../../services/donation-validation.service';

type ValidationListContext = 'list';

@Component({
  standalone: false,
  selector: 'app-validation-list',
  templateUrl: './validation-list.component.html',
  styleUrl: './validation-list.component.scss',
})
export class ValidationListComponent implements OnInit, OnDestroy {
  rows = 10;
  readonly rowsPerPageOptions = [10, 25, 50, 100];

  requests: DonationRequestBackend[] = [];
  first = 0;
  totalRecords = 0;
  tableLoadingSpinner = false;

  private rawCategories: DonationCategoryBackend[] = [];
  private categoryLabelById: Record<number, string> = {};
  private subscriptions: Subscription[] = [];

  constructor(
    private router: Router,
    private donationValidationService: DonationValidationService,
    private donationReferenceService: DonationReferenceService,
    private localStorageService: LocalStorageService,
    private languageDirService: LanguageDirService,
    private translate: TranslationService,
    private messageService: MessageService,
  ) {}

  ngOnInit(): void {
    this.subscriptions.push(
      this.languageDirService.userLanguageCode$.subscribe(() => {
        this.buildCategoryMaps();
      }),
    );
    this.loadCategories();
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

  openRequest(row: DonationRequestBackend, event?: Event): void {
    event?.stopPropagation();
    if (this.tableLoadingSpinner || !row.Donation_Request_ID) {
      return;
    }
    this.router.navigate(['/donations/validation', row.Donation_Request_ID]);
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

  getLocationLabel(row: DonationRequestBackend): string {
    const city = String(row.City || '').trim();
    const country = String(row.Country_Code || '').trim();
    if (city && country) {
      return `${city} / ${country}`;
    }
    return city || country || '-';
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

  // #region Load data
  private loadCategories(): void {
    const sub = this.donationReferenceService.listDonationTypes().subscribe({
      next: (typesResponse: any) => {
        console.log('listDonationTypes response', typesResponse);
        if (!typesResponse?.success) {
          this.rawCategories = [];
          this.buildCategoryMaps();
          return;
        }

        const rawTypes = Object.values(typesResponse.message ?? {}) as DonationTypeBackend[];
        const mappedTypes = this.donationReferenceService.mapDonationTypes(rawTypes);
        if (!mappedTypes.length) {
          this.rawCategories = [];
          this.buildCategoryMaps();
          return;
        }

        const categorySub = forkJoin(
          mappedTypes.map((type) => this.donationReferenceService.listDonationCategories(type.id, false)),
        ).subscribe({
          next: (categoryResponses) => {
            console.log('listDonationCategories response', categoryResponses);
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
          error: () => {
            this.rawCategories = [];
            this.buildCategoryMaps();
          },
        });
        this.subscriptions.push(categorySub);
      },
      error: () => {
        this.rawCategories = [];
        this.buildCategoryMaps();
      },
    });
    this.subscriptions.push(sub);
  }

  private loadRequests(): void {
    this.tableLoadingSpinner = true;
    const currentPage = Math.floor(this.first / this.rows) + 1;
    const lastRequestId = -currentPage;

    const sub = this.donationValidationService
      .listDonationsOpenForValidation([], lastRequestId, this.rows)
      .subscribe({
        next: (response: any) => {
          console.log('listDonationsOpenForValidation response', response);
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
  // #endregion

  private handleBusinessError(context: ValidationListContext, response: any): void {
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
      case 'DAP11055':
        return this.translate.getInstant('donations.validation.errors.accessDenied');
      case 'DAP11040':
      case 'DAP11041':
      case 'DAP11042':
        return this.translate.getInstant('donations.validation.errors.sessionExpired');
      default:
        return null;
    }
  }
}
