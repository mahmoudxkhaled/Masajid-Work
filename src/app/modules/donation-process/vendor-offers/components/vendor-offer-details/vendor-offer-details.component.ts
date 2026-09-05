import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Subscription, forkJoin } from 'rxjs';
import { CountryLookup } from 'src/app/core/models/lookup.model';
import { LanguageDirService } from 'src/app/core/services/language-dir.service';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';
import { PublicLookupService } from 'src/app/core/services/public-lookup.service';
import { TranslationService } from 'src/app/core/services/translation.service';
import { DonationBrowseService } from '../../../browse/services/donation-browse.service';
import { DonationRequestsService } from '../../../facility-requests/services/donation-requests.service';
import { DonationAttachmentOwnerType } from '../../../models/donation-attachment.constants';
import { DonationCategoryBackend } from '../../../models/donation-category.model';
import {
  DonationRequestDetails,
  DonationRequestDetailsBackend,
} from '../../../models/donation-request.model';
import { DonationTypeBackend } from '../../../models/donation-type.model';
import {
  VendorOfferBackend,
  VendorOfferDetails,
  getVendorOfferStatusLabelKey,
  getVendorOfferStatusSeverity,
} from '../../../models/vendor-offer.model';
import { DonationReferenceService } from '../../../services/donation-reference.service';
import { VendorOffersService } from '../../services/vendor-offers.service';

type VendorOfferDetailsContext = 'load' | 'loadRequest';

@Component({
  standalone: false,
  selector: 'app-vendor-offer-details',
  templateUrl: './vendor-offer-details.component.html',
  styleUrl: './vendor-offer-details.component.scss',
})
export class VendorOfferDetailsComponent implements OnInit, OnDestroy {
  offerId = 0;
  requestId = 0;
  loading = true;
  requestLoading = false;
  details: VendorOfferDetails | null = null;
  requestDetails: DonationRequestDetails | null = null;
  withdrawDialogVisible = false;
  locationMapVisible = false;

  typeLabel = '';
  categoryLabel = '';
  countryLabel = '';
  readonly requestAttachmentOwnerType = DonationAttachmentOwnerType.DonationRequest;

  private rawDetails: VendorOfferBackend | null = null;
  private rawRequestDetails: DonationRequestDetailsBackend | null = null;
  private rawTypes: DonationTypeBackend[] = [];
  private rawCategories: DonationCategoryBackend[] = [];
  private countries: CountryLookup[] = [];
  private typeLabelById: Record<number, string> = {};
  private categoryLabelById: Record<number, string> = {};
  private categoryTypeIdById: Record<number, number> = {};
  private countryLabelByCode: Record<string, string> = {};
  private subscriptions: Subscription[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private vendorOffersService: VendorOffersService,
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
    this.offerId = Number(this.route.snapshot.paramMap.get('offerId') || 0);

    const toastDetailKey = history.state?.['toastDetailKey'];
    if (toastDetailKey) {
      const { toastDetailKey: _removed, ...restState } = history.state || {};
      history.replaceState(restState, '');
      setTimeout(() => {
        this.messageService.add({
          severity: 'success',
          summary: this.translate.getInstant('common.success'),
          detail: this.translate.getInstant(String(toastDetailKey)),
        });
      });
    }

    this.subscriptions.push(
      this.languageDirService.userLanguageCode$.subscribe(() => {
        this.buildTypeMaps();
        this.buildCategoryMaps();
        this.buildCountryMaps();
        this.refreshRequestDisplay();
      }),
    );
    this.loadLookups();
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

  get hasMapCoordinates(): boolean {
    return Boolean(this.requestDetails?.latitude && this.requestDetails?.longitude);
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
    this.router.navigate(['/donations/vendor/offers'], {
      state: { toastDetailKey: 'donations.vendorOffers.messages.withdrawn' },
    });
  }

  openLocationMap(): void {
    this.locationMapVisible = true;
  }

  formatOfferAmount(): string {
    if (!this.details?.offerAmount) {
      return '-';
    }
    return `${this.details.offerAmount} ${this.details.currencyCode || ''}`.trim();
  }

  formatRequestCost(): string {
    if (!this.requestDetails?.estimatedCost) {
      return '-';
    }
    return `${this.requestDetails.estimatedCost} ${this.requestDetails.currencyCode || ''}`.trim();
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
    const code = String(this.details.statusCode || '').trim();
    if (!code && !this.details.statusId) {
      return '-';
    }
    return this.translate.getInstant(getVendorOfferStatusLabelKey(this.details.statusId, code));
  }

  getStatusSeverity() {
    if (!this.details) {
      return 'secondary';
    }
    return getVendorOfferStatusSeverity(this.details.statusId, this.details.statusCode);
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
          this.refreshRequestDisplay();
          return;
        }

        this.rawTypes = this.donationReferenceService.parseListFromResponse<DonationTypeBackend>(results.types);
        this.buildTypeMaps();

        const mappedTypes = this.donationReferenceService.mapDonationTypes(this.rawTypes);
        if (!mappedTypes.length) {
          this.rawCategories = [];
          this.buildCategoryMaps();
          this.refreshRequestDisplay();
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
            this.refreshRequestDisplay();
          },
        });
        this.subscriptions.push(categorySub);
      },
    });
    this.subscriptions.push(sub);
  }

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
        this.requestId = Number(this.details?.donationRequestId || 0);
        this.loadRequestDetails();
      },
      error: () => {
        this.loading = false;
      },
    });
    this.subscriptions.push(sub);
  }

  private loadRequestDetails(): void {
    if (!this.requestId) {
      this.requestDetails = null;
      this.requestLoading = false;
      return;
    }

    this.requestLoading = true;
    const sub = this.donationBrowseService.getDonationRequestPublicDetails(this.requestId).subscribe({
      next: (response: any) => {
        console.log('getDonationRequestPublicDetails response', response);
        if (!response?.success) {
          this.handleBusinessError('loadRequest', response);
          this.requestLoading = false;
          return;
        }

        this.rawRequestDetails = this.donationRequestsService.extractDonationRequestDetails(response.message);
        this.requestLoading = false;
        this.refreshRequestDisplay();
      },
      error: () => {
        this.requestLoading = false;
      },
    });
    this.subscriptions.push(sub);
  }

  // #endregion

  private refreshRequestDisplay(): void {
    this.requestDetails = this.donationRequestsService.mapDonationRequestDetails(this.rawRequestDetails);
    if (!this.requestDetails) {
      return;
    }

    this.categoryLabel = this.categoryLabelById[this.requestDetails.donationCategoryId] || '';
    const typeId =
      Number(this.requestDetails.donationTypeId || 0) ||
      Number(this.categoryTypeIdById[this.requestDetails.donationCategoryId] || 0);
    this.typeLabel = this.typeLabelById[typeId] || '';

    const countryCode = String(this.requestDetails.countryCode || '').trim().toUpperCase();
    this.countryLabel = countryCode ? this.countryLabelByCode[countryCode] || countryCode : '-';
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

  private handleBusinessError(context: VendorOfferDetailsContext, response: any): void {
    const code = String(response?.message || '');
    let detail: string | null = null;

    switch (context) {
      case 'load':
        detail = this.getLoadErrorMessage(code);
        break;
      case 'loadRequest':
        detail = this.getLoadRequestErrorMessage(code);
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

  private getLoadRequestErrorMessage(code: string): string | null {
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
