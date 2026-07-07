import { Component, Input, OnChanges, OnDestroy, OnInit, SimpleChanges } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { TranslateService } from '@ngx-translate/core';
import { MessageService } from 'primeng/api';
import { Subscription } from 'rxjs';
import { CountryLookup } from 'src/app/core/models/lookup.model';
import { PublicLookupService } from 'src/app/core/services/public-lookup.service';
import { EntitiesService } from 'src/app/modules/entity-administration/entities/services/entities.service';
import { EntityExtraDataService } from 'src/app/modules/donation-process/services/entity-extra-data.service';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';
import { LanguageDirService } from 'src/app/core/services/language-dir.service';

interface EntityContact {
    address: string;
    addressRegional?: string;
    city: string;
    latitude: string;
    longitude: string;
    phoneNumbers: string[];
    emails: string[];
}

@Component({
    selector: 'app-shared-entity-contact',
    templateUrl: './shared-entity-contact.component.html',
    styleUrls: ['./shared-entity-contact.component.scss']
})
export class SharedEntityContactComponent implements OnInit, OnChanges, OnDestroy {
    @Input() entityId: string = '';
    @Input() entityName: string = '';

    loading = false;
    savingContact = false;
    contacts: EntityContact | null = null;
    displayAddress = '';
    displayPhoneNumbers: string[] = [];
    displayEmails: string[] = [];
    editDialog = false;
    mapPickerVisible = false;
    mapPickerReady = false;
    mapCountryCodeControl = new FormControl('');
    countryOptions: { label: string; value: string }[] = [];
    editForm!: FormGroup;
    submitted = false;
    private subscriptions: Subscription[] = [];
    private countries: CountryLookup[] = [];
    private entityCountryCode = '';

    constructor(
        private fb: FormBuilder,
        private entitiesService: EntitiesService,
        private entityExtraDataService: EntityExtraDataService,
        private lookupService: PublicLookupService,
        private messageService: MessageService,
        private localStorageService: LocalStorageService,
        private languageDirService: LanguageDirService,
        private translate: TranslateService
    ) { }

    ngOnInit(): void {
        this.subscriptions.push(
            this.languageDirService.userLanguageCode$.subscribe(() => {
                this.refreshDisplayLabels();
                this.remapCountryOptions();
                if (this.editDialog && this.editForm && this.contacts) {
                    this.editForm.patchValue({
                        address: this.displayAddress,
                    }, { emitEvent: false });
                }
            })
        );
        this.loadCountryOptions();
        this.tryLoadContacts();
        this.tryLoadEntityCountry();
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['entityId'] && !changes['entityId'].firstChange) {
            this.tryLoadContacts();
            this.tryLoadEntityCountry();
        }
    }

    ngOnDestroy(): void {
        this.subscriptions.forEach((sub) => sub.unsubscribe());
    }

    private tryLoadContacts(): void {
        if (this.entityId) {
            this.loadContacts();
        }
    }

    loadContacts(): void {
        if (!this.entityId) {
            return;
        }

        this.loading = true;
        const sub = this.entitiesService.getEntityContacts(this.entityId).subscribe({
            next: (response: any) => {
                console.log('getEntityContacts response', response);
                if (!response?.success) {
                    this.handleBusinessError(response);
                    return;
                }
                setTimeout(() => {
                    this.mapContactsData(response?.message || {});
                    this.loading = false;
                });
            },
            error: () => {
                this.loading = false;
            }
        });

        this.subscriptions.push(sub);
    }

    private mapContactsData(data: any): void {
        this.contacts = {
            address: data?.Address || '',
            addressRegional: data?.Address_Regional || '',
            city: data?.City || '',
            latitude: data?.Latitude != null ? String(data.Latitude) : '',
            longitude: data?.Longitude != null ? String(data.Longitude) : '',
            phoneNumbers: this.normalizeStringList(data?.PhoneNumbers),
            emails: this.normalizeStringList(data?.Emails),
        };
        this.refreshDisplayLabels();
    }

    private refreshDisplayLabels(): void {
        if (!this.contacts) {
            this.displayAddress = '';
            this.displayPhoneNumbers = [];
            this.displayEmails = [];
            return;
        }

        this.displayAddress = this.localStorageService.pickRequestContentField(
            this.contacts.address,
            this.contacts.addressRegional || '',
        );
        this.displayPhoneNumbers = [...this.contacts.phoneNumbers];
        this.displayEmails = [...this.contacts.emails];
    }

    openEditDialog(): void {
        if (!this.contacts) {
            this.contacts = {
                address: '',
                city: '',
                latitude: '',
                longitude: '',
                phoneNumbers: [],
                emails: []
            };
        }

        this.initEditForm();
        this.editDialog = true;
    }

    initEditForm(): void {
        const address = this.displayAddress || this.localStorageService.pickRequestContentField(
            this.contacts?.address || '',
            this.contacts?.addressRegional || '',
        );

        this.editForm = this.fb.group({
            address: [address, [Validators.required]],
            city: [this.contacts?.city || '', [Validators.required]],
            latitude: [this.contacts?.latitude || '', [Validators.required]],
            longitude: [this.contacts?.longitude || '', [Validators.required]],
            phoneNumbers: this.fb.array([]),
            emails: this.fb.array([])
        });

        if (this.contacts?.phoneNumbers && this.contacts.phoneNumbers.length > 0) {
            this.contacts.phoneNumbers.forEach(phone => {
                this.addPhoneNumber(phone);
            });
        }

        if (this.contacts?.emails && this.contacts.emails.length > 0) {
            this.contacts.emails.forEach(email => {
                this.addEmail(email);
            });
        }
    }

    get f() {
        return this.editForm.controls;
    }

    get phoneNumbersFormArray(): FormArray {
        return this.editForm.get('phoneNumbers') as FormArray;
    }

    get phoneNumberControls(): FormControl[] {
        return this.phoneNumbersFormArray.controls as FormControl[];
    }

    get emailsFormArray(): FormArray {
        return this.editForm.get('emails') as FormArray;
    }

    get emailControls(): FormControl[] {
        return this.emailsFormArray.controls as FormControl[];
    }

    addPhoneNumber(value: string = ''): void {
        const phoneNumbersArray = this.phoneNumbersFormArray;
        phoneNumbersArray.push(this.fb.control(value, [this.phoneNumberValidator]));
    }

    removePhoneNumber(index: number): void {
        this.phoneNumbersFormArray.removeAt(index);
    }

    addEmail(value: string = ''): void {
        const emailsArray = this.emailsFormArray;
        emailsArray.push(this.fb.control(value, [this.emailValidator]));
    }

    removeEmail(index: number): void {
        this.emailsFormArray.removeAt(index);
    }

    private phoneNumberValidator(control: any): { [key: string]: any } | null {
        if (!control.value) {
            return null;
        }
        const value = control.value.toString();
        const digitsOnly = /^\d+$/.test(value);
        return digitsOnly ? null : { invalidFormat: true };
    }

    private emailValidator(control: any): { [key: string]: any } | null {
        if (!control.value) {
            return null;
        }
        const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        return emailPattern.test(control.value) ? null : { email: true };
    }

    onCancelEdit(): void {
        this.editDialog = false;
        this.mapPickerVisible = false;
        this.mapPickerReady = false;
        this.editForm.reset();
        this.submitted = false;
    }

    openMapPicker(): void {
        const open = (countryCode: string) => {
            this.mapPickerReady = false;
            this.mapCountryCodeControl.setValue(countryCode || '');
            this.mapPickerVisible = true;
        };

        if (this.entityCountryCode) {
            open(this.entityCountryCode);
            return;
        }

        if (!this.entityId) {
            open('');
            return;
        }

        const sub = this.entityExtraDataService.getEntityExtraData(Number(this.entityId)).subscribe({
            next: (response: any) => {
                if (response?.success) {
                    const mapped = this.entityExtraDataService.mapEntityExtraData(response.message || {});
                    this.entityCountryCode = String(mapped.countryCode || '').trim().toUpperCase();
                }
                open(this.entityCountryCode);
            },
            error: () => open(''),
        });
        this.subscriptions.push(sub);
    }

    closeMapPicker(): void {
        this.mapPickerVisible = false;
        this.mapPickerReady = false;
    }

    onMapPickerShown(): void {
        setTimeout(() => {
            this.mapPickerReady = true;
        }, 100);
    }

    confirmMapPicker(): void {
        this.editForm.get('latitude')?.markAsDirty();
        this.editForm.get('latitude')?.markAsTouched();
        this.editForm.get('latitude')?.updateValueAndValidity();
        this.editForm.get('longitude')?.markAsDirty();
        this.editForm.get('longitude')?.markAsTouched();
        this.editForm.get('longitude')?.updateValueAndValidity();
        this.mapPickerVisible = false;
    }

    submitUpdate(): void {
        this.submitted = true;

        const addressValue = this.editForm.get('address')?.value?.trim() || '';
        if (!addressValue) {
            this.messageService.add({
                severity: 'warn',
                summary: this.translate.instant('entities.contact.toasts.validationSummary'),
                detail: this.translate.instant('entities.contact.toasts.addressRequired')
            });
            return;
        }

        if (this.editForm.invalid || this.savingContact) {
            if (this.editForm.invalid) {
                this.messageService.add({
                    severity: 'warn',
                    summary: this.translate.instant('entities.contact.toasts.validationSummary'),
                    detail: this.translate.instant('entities.contact.toasts.fixFormErrors')
                });
            }
            return;
        }

        const formValue = this.editForm.value;
        const address = formValue.address || '';
        const isRegional = this.localStorageService.isRegionalApiInput();
        const city = String(formValue.city || '').trim();
        const latitude = String(formValue.latitude || '').trim();
        const longitude = String(formValue.longitude || '').trim();

        const phoneNumbers = this.phoneNumbersFormArray.controls
            .map(control => control.value)
            .filter(value => value && value.trim() !== '');

        const emails = this.emailsFormArray.controls
            .map(control => control.value)
            .filter(value => value && value.trim() !== '');

        this.savingContact = true;

        const sub = this.entitiesService.updateEntityContacts(
            this.entityId,
            address,
            isRegional,
            phoneNumbers,
            city,
            latitude,
            longitude,
            emails
        ).subscribe({
            next: (response: any) => {
                if (!response?.success) {
                    this.handleUpdateError(response);
                    return;
                }

                this.messageService.add({
                    severity: 'success',
                    summary: this.translate.instant('common.success'),
                    detail: this.translate.instant('entities.contact.toasts.updatedSuccessfully'),
                    life: 3000
                });

                this.editDialog = false;
                this.submitted = false;
                this.savingContact = false;
                this.editForm.reset();
                setTimeout(() => this.loadContacts());
            },
            error: () => {
                this.savingContact = false;
            }
        });

        this.subscriptions.push(sub);
    }

    private handleUpdateError(response: any): void {
        const code = String(response?.message || '');
        const detail = this.getUpdateErrorMessage(code);

        if (detail) {
            this.messageService.add({
                severity: 'error',
                summary: this.translate.instant('common.error'),
                detail
            });
        }
        this.savingContact = false;
    }

    private getUpdateErrorMessage(code: string): string | null {
        switch (code) {
            case 'DAP11260':
                return this.translate.instant('entities.contact.errors.invalidEntityId');
            case 'DAP11271':
                return this.translate.instant('entities.contact.errors.invalidAddressFormat');
            case 'DAP11272':
                return this.translate.instant('entities.contact.errors.invalidPhoneFormat');
            case 'DAP11274':
                return this.translate.instant('entities.contact.errors.invalidEmailFormat');
            case 'DAP11259':
                return this.translate.instant('entities.contact.errors.invalidCity');
            case 'DAP11264':
                return this.translate.instant('entities.contact.errors.invalidLatitude');
            case 'DAP11265':
                return this.translate.instant('entities.contact.errors.invalidLongitude');
        }
        return null;
    }

    private handleBusinessError(response: any): void {
        const code = String(response?.message || '');
        if (code === 'DAP11260') {
            this.messageService.add({
                severity: 'error',
                summary: this.translate.instant('common.error'),
                detail: this.translate.instant('entities.contact.errors.invalidEntityId')
            });
        }
        setTimeout(() => {
            this.loading = false;
        });
    }

    private normalizeStringList(value: unknown): string[] {
        if (Array.isArray(value)) {
            return value
                .map((item) => String(item ?? '').trim())
                .filter((item) => item !== '');
        }

        if (value && typeof value === 'object') {
            return Object.values(value as Record<string, unknown>)
                .map((item) => String(item ?? '').trim())
                .filter((item) => item !== '');
        }

        return [];
    }

    private loadCountryOptions(): void {
        const sub = this.lookupService.getCountries().subscribe((countries) => {
            this.countries = this.lookupService.sortCountriesByLabel(
                countries,
                this.localStorageService.isArabicUi(),
            );
            this.remapCountryOptions();
        });
        this.subscriptions.push(sub);
    }

    private tryLoadEntityCountry(): void {
        if (!this.entityId) {
            this.entityCountryCode = '';
            return;
        }

        const sub = this.entityExtraDataService.getEntityExtraData(Number(this.entityId)).subscribe({
            next: (response: any) => {
                if (!response?.success) {
                    return;
                }
                const mapped = this.entityExtraDataService.mapEntityExtraData(response.message || {});
                this.entityCountryCode = String(mapped.countryCode || '').trim().toUpperCase();
            },
        });
        this.subscriptions.push(sub);
    }

    private remapCountryOptions(): void {
        const isArabic = this.localStorageService.isArabicUi();
        this.countryOptions = this.countries.map((country) => ({
            label: this.lookupService.getCountryLabel(country, isArabic),
            value: country.code,
        }));
    }
}
