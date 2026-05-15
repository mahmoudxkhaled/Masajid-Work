import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { TranslateService } from '@ngx-translate/core';
import { MessageService } from 'primeng/api';
import { Subscription } from 'rxjs';
import { EntitiesService } from 'src/app/modules/entity-administration/entities/services/entities.service';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';
import { LanguageDirService } from 'src/app/core/services/language-dir.service';

interface EntityContact {
    address: string;
    addressRegional?: string;
    phoneNumbers: string[];
    faxNumbers: string[];
    emails: string[];
}

@Component({
    selector: 'app-shared-entity-contact',
    templateUrl: './shared-entity-contact.component.html',
    styleUrls: ['./shared-entity-contact.component.scss']
})
export class SharedEntityContactComponent implements OnInit, OnDestroy {
    @Input() entityId: string = '';
    @Input() entityName: string = '';

    loading = false;
    savingContact = false;
    contacts: EntityContact | null = null;
    editDialog = false;
    editForm!: FormGroup;
    submitted = false;
    isRegional: boolean = false;
    private subscriptions: Subscription[] = [];

    constructor(
        private fb: FormBuilder,
        private entitiesService: EntitiesService,
        private messageService: MessageService,
        private localStorageService: LocalStorageService,
        private languageDirService: LanguageDirService,
        private translate: TranslateService
    ) {
        this.isRegional = this.localStorageService.getPreferredLanguageCode() === 'ar';
    }

    ngOnInit(): void {
        this.subscriptions.push(
            this.languageDirService.userLanguageCode$.subscribe(() => {
                this.isRegional = this.localStorageService.getPreferredLanguageCode() === 'ar';
            })
        );
        if (this.entityId) {
            this.loadContacts();
        }
    }

    ngOnDestroy(): void {
        this.subscriptions.forEach((sub) => sub.unsubscribe());
    }

    loadContacts(): void {
        if (!this.entityId) {
            return;
        }

        this.loading = true;
        const sub = this.entitiesService.getEntityContacts(this.entityId).subscribe({
            next: (response: any) => {
                if (!response?.success) {
                    this.handleBusinessError(response);
                    return;
                }
                this.mapContactsData(response?.message || {});
                this.loading = false;
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
            phoneNumbers: Array.isArray(data?.PhoneNumbers)
                ? data.PhoneNumbers
                : [],
            faxNumbers: Array.isArray(data?.FaxNumbers)
                ? data.FaxNumbers
                : [],
            emails: Array.isArray(data?.Emails)
                ? data.Emails
                : []
        };
    }

    openEditDialog(): void {
        if (!this.contacts) {
            this.contacts = {
                address: '',
                phoneNumbers: [],
                faxNumbers: [],
                emails: []
            };
        }

        this.initEditForm();
        this.editDialog = true;
    }

    initEditForm(): void {
        const address = this.isRegional && this.contacts?.addressRegional
            ? this.contacts.addressRegional
            : (this.contacts?.address || '');

        this.editForm = this.fb.group({
            address: [address, [Validators.required]],
            isRegional: [this.isRegional, []],
            phoneNumbers: this.fb.array([]),
            faxNumbers: this.fb.array([]),
            emails: this.fb.array([])
        });

        if (this.contacts?.phoneNumbers && this.contacts.phoneNumbers.length > 0) {
            this.contacts.phoneNumbers.forEach(phone => {
                this.addPhoneNumber(phone);
            });
        }

        if (this.contacts?.faxNumbers && this.contacts.faxNumbers.length > 0) {
            this.contacts.faxNumbers.forEach(fax => {
                this.addFaxNumber(fax);
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

    get faxNumbersFormArray(): FormArray {
        return this.editForm.get('faxNumbers') as FormArray;
    }

    get faxNumberControls(): FormControl[] {
        return this.faxNumbersFormArray.controls as FormControl[];
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

    addFaxNumber(value: string = ''): void {
        const faxNumbersArray = this.faxNumbersFormArray;
        faxNumbersArray.push(this.fb.control(value, [this.phoneNumberValidator]));
    }

    removeFaxNumber(index: number): void {
        this.faxNumbersFormArray.removeAt(index);
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
        this.editForm.reset();
        this.submitted = false;
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
        const isRegional = formValue.isRegional || false;

        const phoneNumbers = this.phoneNumbersFormArray.controls
            .map(control => control.value)
            .filter(value => value && value.trim() !== '');

        const faxNumbers = this.faxNumbersFormArray.controls
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
            faxNumbers,
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
                this.editForm.reset();
                this.submitted = false;
                this.loadContacts();
                this.savingContact = false;
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
            case 'ERP11260':
                return this.translate.instant('entities.contact.errors.invalidEntityId');
            case 'ERP11271':
                return this.translate.instant('entities.contact.errors.invalidAddressFormat');
            case 'ERP11272':
                return this.translate.instant('entities.contact.errors.invalidPhoneFormat');
            case 'ERP11273':
                return this.translate.instant('entities.contact.errors.invalidFaxFormat');
            case 'ERP11274':
                return this.translate.instant('entities.contact.errors.invalidEmailFormat');
        }
        return null;
    }

    private handleBusinessError(response: any): void {
        const code = String(response?.message || '');
        if (code === 'ERP11260') {
            this.messageService.add({
                severity: 'error',
                summary: this.translate.instant('common.error'),
                detail: this.translate.instant('entities.contact.errors.invalidEntityId')
            });
        }
        this.loading = false;
    }

    getDisplayAddress(): string {
        if (!this.contacts) {
            return '';
        }
        return this.isRegional && this.contacts.addressRegional
            ? this.contacts.addressRegional
            : (this.contacts.address || '');
    }

    private sanitizeList(list?: string[]): string[] {
        if (!Array.isArray(list)) {
            return [];
        }
        return list
            .map(item => (item ?? '').toString().trim())
            .filter(item => item !== '');
    }

    formatPhoneDisplay(phone: string): string {
        const cleaned = phone.replace(/\D/g, '');
        if (cleaned.length === 10) {
            return cleaned.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3');
        }
        return phone;
    }

    hasPhoneNumbers(): boolean {
        return this.getPhoneNumbersForDisplay().length > 0;
    }

    getPhoneNumbersForDisplay(): string[] {
        return this.sanitizeList(this.contacts?.phoneNumbers);
    }

    hasFaxNumbers(): boolean {
        return this.getFaxNumbersForDisplay().length > 0;
    }

    getFaxNumbersForDisplay(): string[] {
        return this.sanitizeList(this.contacts?.faxNumbers);
    }

    hasEmails(): boolean {
        return this.getEmailsForDisplay().length > 0;
    }

    getEmailsForDisplay(): string[] {
        return this.sanitizeList(this.contacts?.emails);
    }
}
