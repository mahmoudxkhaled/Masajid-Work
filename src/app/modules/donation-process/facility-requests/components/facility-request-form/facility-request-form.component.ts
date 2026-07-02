import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Subscription, forkJoin } from 'rxjs';
import { CountryLookup, CurrencyLookup } from 'src/app/core/models/lookup.model';
import { LanguageDirService } from 'src/app/core/services/language-dir.service';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';
import { PublicLookupService } from 'src/app/core/services/public-lookup.service';
import { TranslationService } from 'src/app/core/services/translation.service';
import { EntitiesService } from 'src/app/modules/entity-administration/entities/services/entities.service';
import {
  CreateDonationRequestRequest,
  DonationRequestDetails,
  UpdateDonationRequestRequest,
} from '../../../models/donation-request.model';
import { DonationRequestStatusBackend } from '../../../models/donation-request-status.model';
import { DonationTypeBackend } from '../../../models/donation-type.model';
import { EntityExtraDataService } from '../../../services/entity-extra-data.service';
import { DonationReferenceService } from '../../../services/donation-reference.service';
import { DonationRequestsService } from '../../services/donation-requests.service';
import {
  countryCode3Required,
  currencyCode3Validator,
  estimatedCostValidator,
  latitudeValidator,
  longitudeValidator,
  quantityValidator,
} from '../../utils/donation-request.validators';

type FacilityRequestFormContext = 'create' | 'update' | 'submit' | 'load';

@Component({
  standalone: false,
  selector: 'app-facility-request-form',
  templateUrl: './facility-request-form.component.html',
  styleUrl: './facility-request-form.component.scss',
})
export class FacilityRequestFormComponent implements OnInit, OnDestroy {
  isEditMode = false;
  requestId = 0;
  entityId = 0;
  loading = true;
  saving = false;
  typeOptions: { label: string; value: number }[] = [];
  countryOptions: { label: string; value: string }[] = [];
  currencyOptions: { label: string; value: string }[] = [];
  selectedDonationTypeId: number | null = null;
  selectedCategoryId: number | null = null;
  private submitted = false;

  private countries: CountryLookup[] = [];
  private currencies: CurrencyLookup[] = [];
  private rawTypes: DonationTypeBackend[] = [];
  private rawStatuses: DonationRequestStatusBackend[] = [];
  private subscriptions: Subscription[] = [];

  form = this.fb.group({
    title: ['', Validators.required],
    description: ['', Validators.required],
    quantity: [null as number | null, [Validators.required, quantityValidator()]],
    unit: ['', Validators.required],
    estimatedCost: [0, [Validators.required, estimatedCostValidator()]],
    currencyCode: ['', currencyCode3Validator()],
    needsInstallation: [false],
    countryCode: ['', countryCode3Required()],
    city: ['', Validators.required],
    address: ['', Validators.required],
    latitude: ['', latitudeValidator()],
    longitude: ['', longitudeValidator()],
    isRegional: [false],
  });

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private donationRequestsService: DonationRequestsService,
    private donationReferenceService: DonationReferenceService,
    private entityExtraDataService: EntityExtraDataService,
    private entitiesService: EntitiesService,
    private localStorageService: LocalStorageService,
    private lookupService: PublicLookupService,
    private languageDirService: LanguageDirService,
    private translate: TranslationService,
    private messageService: MessageService,
  ) { }

  ngOnInit(): void {
    this.entityId = Number(this.localStorageService.getEntityId() || 0);
    this.isEditMode = this.route.snapshot.url.some((segment) => segment.path === 'edit');
    this.requestId = Number(this.route.snapshot.paramMap.get('id') || 0);

    this.subscriptions.push(
      this.languageDirService.userLanguageCode$.subscribe(() => {
        this.remapTypes();
        this.remapLookups();
      }),
    );

    this.loadInitialData();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  onDonationTypeChange(typeId: number | null): void {
    this.selectedDonationTypeId = typeId;
    this.selectedCategoryId = null;
  }

  onCategoryChange(categoryId: number | null): void {
    this.selectedCategoryId = categoryId;
  }

  onCountryChange(code: string | null): void {
    this.form.patchValue({ countryCode: code || '' });
  }

  onCurrencyChange(code: string | null): void {
    this.form.patchValue({ currencyCode: code || '' });
  }

  cancel(): void {
    this.router.navigate(['/donations/facility/requests']);
  }

  saveDraft(): void {
    this.submitForm(false);
  }

  saveAndSubmit(): void {
    this.submitForm(true);
  }

  showError(controlName: string): boolean {
    const control = this.form.get(controlName);
    return !!control && control.touched && control.invalid;
  }

  showCategoryError(): boolean {
    return this.submitted && !this.selectedCategoryId;
  }

  get pageTitleKey(): string {
    return this.isEditMode
      ? 'donations.facility.requests.form.editTitle'
      : 'donations.facility.requests.form.createTitle';
  }

  private loadInitialData(): void {
    this.loading = true;

    const sub = forkJoin({
      types: this.donationReferenceService.listDonationTypes(),
      statuses: this.donationReferenceService.listDonationRequestStatuses(),
      countries: this.lookupService.getCountries(),
      currencies: this.lookupService.getCurrencies(),
    }).subscribe({
      next: (results) => {
        if (results.types?.success) {
          this.rawTypes = Object.values(results.types.message ?? {});
          this.remapTypes();
        }

        if (results.statuses?.success) {
          this.rawStatuses = Object.values(results.statuses.message ?? {});
        }

        this.countries = this.lookupService.sortCountriesByLabel(
          results.countries,
          this.localStorageService.getPreferredLanguageCode() === 'ar',
        );
        this.currencies = results.currencies;
        this.remapLookups();

        if (this.isEditMode && this.requestId) {
          this.loadExistingRequest();
        } else {
          this.prefillLocation();
        }
      },
      error: () => {
        this.loading = false;
      },
    });

    this.subscriptions.push(sub);
  }

  private loadExistingRequest(): void {
    const sub = this.donationRequestsService.getDonationRequestDetails(this.requestId).subscribe({
      next: (response: any) => {
        if (!response?.success) {
          this.handleBusinessError('load', response);
          this.loading = false;
          return;
        }

        const details = this.donationRequestsService.mapDonationRequestDetails(response.message);
        if (!details) {
          this.loading = false;
          this.router.navigate(['/donations/facility/requests']);
          return;
        }

        if (details.statusCode.toUpperCase() !== 'DRAFT') {
          this.messageService.add({
            severity: 'warn',
            summary: this.translate.getInstant('common.error'),
            detail: this.translate.getInstant('donations.facility.requests.errors.cannotModifyPublished'),
          });
          this.router.navigate(['/donations/facility/requests', this.requestId]);
          return;
        }

        this.patchFormFromDetails(details);
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
    this.subscriptions.push(sub);
  }

  private prefillLocation(): void {
    if (!this.entityId) {
      this.loading = false;
      return;
    }

    const sub = forkJoin({
      contacts: this.entitiesService.getEntityContacts(String(this.entityId)),
      extra: this.entityExtraDataService.getEntityExtraData(this.entityId),
    }).subscribe({
      next: (results) => {
        const patch: Record<string, string | boolean> = {
          isRegional: this.localStorageService.getPreferredLanguageCode() === 'ar',
        };

        if (results.contacts?.success) {
          const data = results.contacts.message || {};
          patch['address'] = String(data.Address || '');
          patch['city'] = String(data.City || '');
          if (data.Latitude != null) {
            patch['latitude'] = String(data.Latitude);
          }
          if (data.Longitude != null) {
            patch['longitude'] = String(data.Longitude);
          }
        }

        if (results.extra?.success) {
          const mapped = this.entityExtraDataService.mapEntityExtraData(results.extra.message || {});
          if (mapped.countryCode) {
            patch['countryCode'] = mapped.countryCode.toUpperCase();
          }
        }

        this.form.patchValue(patch);
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
    this.subscriptions.push(sub);
  }

  private patchFormFromDetails(details: DonationRequestDetails): void {
    this.selectedDonationTypeId = details.donationTypeId || null;
    this.selectedCategoryId = details.donationCategoryId || null;
    this.form.patchValue({
      title: details.title,
      description: details.description,
      quantity: details.quantity,
      unit: details.unit,
      estimatedCost: details.estimatedCost,
      currencyCode: details.currencyCode,
      needsInstallation: details.needsInstallation,
      countryCode: details.countryCode,
      city: details.city,
      address: details.address,
      latitude: String(details.latitude),
      longitude: String(details.longitude),
      isRegional: details.isRegional,
    });
  }

  private submitForm(submitAfterSave: boolean): void {
    if (this.saving) {
      return;
    }

    this.submitted = true;
    this.form.markAllAsTouched();
    if (!this.selectedCategoryId || this.form.invalid) {
      return;
    }

    this.saving = true;
    const raw = this.form.getRawValue();
    const payloadBase = {
      donationCategoryId: this.selectedCategoryId,
      title: String(raw.title ?? '').trim(),
      description: String(raw.description ?? '').trim(),
      isRegional: Boolean(raw.isRegional),
      quantity: Number(raw.quantity),
      unit: String(raw.unit ?? '').trim(),
      estimatedCost: Number(raw.estimatedCost ?? 0),
      currencyCode: String(raw.currencyCode ?? '').trim().toUpperCase(),
      needsInstallation: Boolean(raw.needsInstallation),
      address: String(raw.address ?? '').trim(),
      latitude: Number(raw.latitude),
      longitude: Number(raw.longitude),
      city: String(raw.city ?? '').trim(),
      countryCode: String(raw.countryCode ?? '').trim().toUpperCase(),
    };

    if (this.isEditMode) {
      const dto: UpdateDonationRequestRequest = {
        donationRequestId: this.requestId,
        ...payloadBase,
      };
      const sub = this.donationRequestsService.updateDonationRequest(dto).subscribe({
        next: (response: any) => {
          if (!response?.success) {
            this.handleBusinessError('update', response);
            return;
          }
          this.onSaveSuccess(submitAfterSave, this.requestId, 'updated');
        },
        error: () => {
          this.saving = false;
        },
      });
      this.subscriptions.push(sub);
      return;
    }

    const dto: CreateDonationRequestRequest = {
      entityId: this.entityId,
      ...payloadBase,
    };
    const sub = this.donationRequestsService.createDonationRequest(dto).subscribe({
      next: (response: any) => {
        console.log('createDonationRequest response', response);
        if (!response?.success) {
          this.handleBusinessError('create', response);
          return;
        }
        const newId = this.donationRequestsService.extractDonationRequestId(response.message);
        this.onSaveSuccess(submitAfterSave, newId, 'created');
      },
      error: () => {
        this.saving = false;
      },
    });
    this.subscriptions.push(sub);
  }

  private onSaveSuccess(submitAfterSave: boolean, requestId: number, messageKey: 'created' | 'updated'): void {
    if (!submitAfterSave) {
      this.messageService.add({
        severity: 'success',
        summary: this.translate.getInstant('common.success'),
        detail: this.translate.getInstant(`donations.facility.requests.messages.${messageKey}`),
      });
      this.saving = false;
      this.router.navigate(['/donations/facility/requests', requestId]);
      return;
    }

    const sub = this.donationRequestsService.submitDonationRequestForReview(requestId).subscribe({
      next: (response: any) => {
        this.saving = false;
        if (!response?.success) {
          this.handleBusinessError('submit', response);
          this.router.navigate(['/donations/facility/requests', requestId]);
          return;
        }
        this.messageService.add({
          severity: 'success',
          summary: this.translate.getInstant('common.success'),
          detail: this.translate.getInstant('donations.facility.requests.messages.submitted'),
        });
        this.router.navigate(['/donations/facility/requests', requestId]);
      },
      error: () => {
        this.saving = false;
      },
    });
    this.subscriptions.push(sub);
  }

  private remapTypes(): void {
    this.typeOptions = this.donationReferenceService.toTypeDropdownOptions(this.rawTypes);
  }

  private remapLookups(): void {
    const isArabic = this.localStorageService.getPreferredLanguageCode() === 'ar';
    this.countryOptions = this.countries.map((item) => ({
      label: this.lookupService.getCountryLabel(item, isArabic),
      value: item.code,
    }));
    this.currencyOptions = this.currencies.map((item) => ({
      label: `${this.lookupService.getCurrencyLabel(item, isArabic)} (${item.code})`,
      value: item.code,
    }));
  }

  private handleBusinessError(context: FacilityRequestFormContext, response: any): void {
    const code = String(response?.message || '');
    let detail: string | null = null;

    switch (context) {
      case 'create':
        detail = this.getCreateErrorMessage(code);
        break;
      case 'update':
        detail = this.getUpdateErrorMessage(code);
        break;
      case 'submit':
        detail = this.getSubmitErrorMessage(code);
        break;
      case 'load':
        detail = this.getLoadErrorMessage(code);
        break;
    }

    this.saving = false;
    this.loading = false;

    if (detail) {
      this.messageService.add({
        severity: 'error',
        summary: this.translate.getInstant('common.error'),
        detail,
      });
    }
  }

  private getCreateErrorMessage(code: string): string | null {
    return this.getSharedMutationErrorMessage(code);
  }

  private getUpdateErrorMessage(code: string): string | null {
    switch (code) {
      case 'DAP13032':
        return this.translate.getInstant('donations.facility.requests.errors.cannotModifyPublished');
      default:
        return this.getSharedMutationErrorMessage(code);
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

  private getLoadErrorMessage(code: string): string | null {
    switch (code) {
      case 'DAP13000':
        return this.translate.getInstant('donations.facility.requests.errors.invalidRequestId');
      default:
        return null;
    }
  }

  private getSharedMutationErrorMessage(code: string): string | null {
    switch (code) {
      case 'DAP13001':
        return this.translate.getInstant('donations.facility.requests.errors.invalidCategoryId');
      case 'DAP13013':
        return this.translate.getInstant('donations.facility.requests.messages.notOwnerFacility');
      case 'DAP13019':
        return this.translate.getInstant('donations.facility.requests.errors.invalidQuantity');
      case 'DAP13020':
        return this.translate.getInstant('donations.facility.requests.errors.invalidTitle');
      case 'DAP13021':
        return this.translate.getInstant('donations.facility.requests.errors.invalidCurrency');
      case 'DAP13022':
        return this.translate.getInstant('donations.facility.requests.errors.invalidCountry');
      case 'DAP13023':
        return this.translate.getInstant('donations.facility.requests.errors.invalidUnit');
      default:
        return null;
    }
  }
}
