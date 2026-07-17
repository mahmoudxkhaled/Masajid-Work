import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Subscription, forkJoin } from 'rxjs';
import { CountryLookup } from 'src/app/core/models/lookup.model';
import { LanguageDirService } from 'src/app/core/services/language-dir.service';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';
import { PublicLookupService } from 'src/app/core/services/public-lookup.service';
import { TranslationService } from 'src/app/core/services/translation.service';
import {
  DonationRequestDetails,
  DonationRequestDetailsBackend,
} from '../../../models/donation-request.model';
import { DonationRequestStatusBackend } from '../../../models/donation-request-status.model';
import { DonationCategoryBackend } from '../../../models/donation-category.model';
import { DonationTypeBackend } from '../../../models/donation-type.model';
import { DonationReferenceService } from '../../../services/donation-reference.service';
import { DonationRequestsService } from '../../../facility-requests/services/donation-requests.service';
import { DonationBrowseService } from '../../../browse/services/donation-browse.service';

type VendorRequestDetailsContext = 'load';

@Component({
  standalone: false,
  selector: 'app-vendor-request-details',
  templateUrl: './vendor-request-details.component.html',
  styleUrl: './vendor-request-details.component.scss',
})
export class VendorRequestDetailsComponent implements OnInit, OnDestroy {
  requestId = 0;
  loading = true;
  details: DonationRequestDetails | null = null;
  createOfferDialogVisible = false;
  locationMapVisible = false;

  typeLabel = '';
  categoryLabel = '';
  statusLabel = '';
  statusSeverity: 'success' | 'info' | 'warning' | 'danger' | 'secondary' | 'contrast' = 'info';
  countryLabel = '';

  private rawDetails: DonationRequestDetailsBackend | null = null;
  private statuses: DonationRequestStatusBackend[] = [];
  private rawTypes: DonationTypeBackend[] = [];
  private rawCategories: DonationCategoryBackend[] = [];
  private countries: CountryLookup[] = [];
  private statusLabelById: Record<number, string> = {};
  private statusCodeById: Record<number, string> = {};
  private typeLabelById: Record<number, string> = {};
  private categoryLabelById: Record<number, string> = {};
  private categoryTypeIdById: Record<number, number> = {};
  private countryLabelByCode: Record<string, string> = {};
  private subscriptions: Subscription[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private donationBrowseService: DonationBrowseService,
    private donationRequestsService: DonationRequestsService,
    private donationReferenceService: DonationReferenceService,
    private lookupService: PublicLookupService,
    private localStorageService: LocalStorageService,
    private languageDirService: LanguageDirService,
    private translate: TranslationService,
    private messageService: MessageService,
  ) { }

  ngOnInit(): void {
    this.requestId = Number(this.route.snapshot.paramMap.get('requestId') || 0);
    this.subscriptions.push(
      this.languageDirService.userLanguageCode$.subscribe(() => {
        this.buildStatusMaps();
        this.buildTypeMaps();
        this.buildCategoryMaps();
        this.buildCountryMaps();
        this.refreshDisplay();
      }),
    );
    this.loadLookups();
    this.loadDetails();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  get hasMapCoordinates(): boolean {
    return Boolean(this.details?.latitude && this.details?.longitude);
  }

  backToList(): void {
    this.router.navigate(['/donations/vendor/requests']);
  }

  formatCost(): string {
    if (!this.details?.estimatedCost) {
      return '-';
    }
    return `${this.details.estimatedCost} ${this.details.currencyCode || ''}`.trim();
  }

  openCreateOfferDialog(): void {
    this.createOfferDialogVisible = true;
  }

  openLocationMap(): void {
    this.locationMapVisible = true;
  }

  onOfferCreated(offerId: number): void {
    if (offerId) {
      void this.router.navigate(['/donations/vendor/offers', offerId]);
    }
  }

  // #region Load data

  private loadLookups(): void {
    const sub = forkJoin({
      statuses: this.donationReferenceService.listDonationRequestStatuses(),
      types: this.donationReferenceService.listDonationTypes(),
      countries: this.lookupService.getCountries(),
    }).subscribe({
      next: (results) => {
        if (results.statuses?.success) {
          this.statuses = this.donationReferenceService.extractDictionaryItems<DonationRequestStatusBackend>(
            results.statuses.message,
            'Request_Statuses',
          );
          this.buildStatusMaps();
        }

        this.countries = this.lookupService.sortCountriesByLabel(
          results.countries,
          this.localStorageService.isArabicUi(),
        );
        this.buildCountryMaps();

        if (!results.types?.success) {
          this.refreshDisplay();
          return;
        }

        this.rawTypes = this.donationReferenceService.parseListFromResponse<DonationTypeBackend>(results.types);
        this.buildTypeMaps();

        const mappedTypes = this.donationReferenceService.mapDonationTypes(this.rawTypes);
        if (!mappedTypes.length) {
          this.rawCategories = [];
          this.buildCategoryMaps();
          this.refreshDisplay();
          return;
        }

        const categorySub = forkJoin(
          mappedTypes.map((type) => this.donationReferenceService.listDonationCategories(type.id, false)),
        ).subscribe({
          next: (categoryResponses) => {
            this.rawCategories = [];
            categoryResponses.forEach((response: any, index) => {
              if (!response?.success) {
                return;
              }
              const typeId = mappedTypes[index]?.id || 0;
              const items = this.donationReferenceService.parseListFromResponse<DonationCategoryBackend>(response);
              items.forEach((item) => {
                this.rawCategories.push({
                  ...item,
                  Donation_Type_ID: Number(item.Donation_Type_ID || typeId),
                });
              });
            });
            this.buildCategoryMaps();
            this.refreshDisplay();
          },
        });
        this.subscriptions.push(categorySub);
      },
    });
    this.subscriptions.push(sub);
  }

  private loadDetails(): void {
    this.loading = true;
    const sub = this.donationBrowseService.getDonationRequestPublicDetails(this.requestId).subscribe({
      next: (response: any) => {
        console.log('getDonationRequestPublicDetails response', response);
        if (!response?.success) {
          this.handleBusinessError('load', response);
          this.loading = false;
          return;
        }

        this.rawDetails = this.donationRequestsService.extractDonationRequestDetails(response.message);
        this.loading = false;
        this.refreshDisplay();
      },
      error: () => {
        this.loading = false;
      },
    });
    this.subscriptions.push(sub);
  }

  // #endregion

  private refreshDisplay(): void {
    this.details = this.donationRequestsService.mapDonationRequestDetails(this.rawDetails);
    if (!this.details) {
      return;
    }

    this.statusLabel = this.statusLabelById[this.details.statusId] || '';
    this.statusSeverity = this.getStatusSeverity(this.statusCodeById[this.details.statusId] || this.details.statusCode);
    this.categoryLabel = this.categoryLabelById[this.details.donationCategoryId] || '';

    const typeId =
      Number(this.details.donationTypeId || 0) ||
      Number(this.categoryTypeIdById[this.details.donationCategoryId] || 0);
    this.typeLabel = this.typeLabelById[typeId] || '';

    const countryCode = String(this.details.countryCode || '').trim().toUpperCase();
    this.countryLabel = countryCode ? this.countryLabelByCode[countryCode] || countryCode : '-';
  }

  private buildStatusMaps(): void {
    this.statusLabelById = {};
    this.statusCodeById = {};
    for (const item of this.donationReferenceService.mapDonationRequestStatuses(this.statuses)) {
      if (!item.id) {
        continue;
      }
      this.statusLabelById[item.id] = item.name;
      this.statusCodeById[item.id] = item.code;
    }
  }

  private buildTypeMaps(): void {
    this.typeLabelById = {};
    for (const item of this.donationReferenceService.mapDonationTypes(this.rawTypes)) {
      if (!item.id) {
        continue;
      }
      this.typeLabelById[item.id] = item.name;
    }
  }

  private buildCategoryMaps(): void {
    this.categoryLabelById = {};
    this.categoryTypeIdById = {};
    for (const item of this.donationReferenceService.mapDonationCategories(this.rawCategories)) {
      if (!item.id) {
        continue;
      }
      this.categoryLabelById[item.id] = item.name;
      this.categoryTypeIdById[item.id] = item.donationTypeId;
    }
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

  private getStatusSeverity(code: string): 'success' | 'info' | 'warning' | 'danger' | 'secondary' | 'contrast' {
    const normalized = String(code || '').toUpperCase();
    if (normalized === 'PUBLISHED') {
      return 'success';
    }
    if (normalized === 'REJECTED' || normalized === 'CANCELLED') {
      return 'danger';
    }
    if (normalized === 'PENDING_REVIEW') {
      return 'warning';
    }
    return 'info';
  }

  private handleBusinessError(context: VendorRequestDetailsContext, response: any): void {
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
