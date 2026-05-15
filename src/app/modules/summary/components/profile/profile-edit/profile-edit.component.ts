import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslationService } from 'src/app/core/services/translation.service';
import { MessageService } from 'primeng/api';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';
import { UserNameService } from 'src/app/core/services/user-name.service';
import { IUserDetails, IAccountDetails, IEntityDetails, IAccountSettings } from 'src/app/core/models/account-status.model';
import { ProfileApiService } from '../../../services/profile-api.service';
import { ProfileContactInfo } from '../../../models/profile.model';
import { Observable, Subscription } from 'rxjs';
import { nameFieldValidator, getNameFieldError, textFieldValidator, getTextFieldError } from 'src/app/core/validators/text-field.validator';

type ProfileContext = 'update' | 'contact' | 'preferences';

@Component({
    selector: 'app-profile-edit',
    templateUrl: './profile-edit.component.html',
    styleUrls: ['./profile-edit.component.scss'],
    providers: [MessageService]
})
export class ProfileEditComponent implements OnInit, OnDestroy {

    profileForm!: FormGroup;
    contactInfoForm!: FormGroup;

    gender: boolean = false;

    userDetails: IUserDetails | null = null;
    accountDetails: IAccountDetails | null = null;
    entityDetails: IEntityDetails | null = null;
    accountSettings: IAccountSettings | null = null;
    isRegional: boolean = false;

    // API integration properties
    currentUserId: number | null = null;
    userContactInfo: ProfileContactInfo | null = null;
    isLoading$: Observable<boolean>;
    loadingContactInfo: boolean = false;
    saving: boolean = false;
    savingContactInfo: boolean = false;

    genderOptions = [
        { label: 'Male', value: true },
        { label: 'Female', value: false }
    ];

    private subscriptions: Subscription[] = [];

    constructor(
        private fb: FormBuilder,
        public translate: TranslationService,
        private messageService: MessageService,
        private localStorageService: LocalStorageService,
        private profileApiService: ProfileApiService,
        private userNameService: UserNameService,
        private router: Router
    ) {
        this.isLoading$ = this.profileApiService.isLoadingSubject.asObservable();
    }

    ngOnInit(): void {
        this.loadUserData();
        this.initFormModels();
        this.initContactInfoForm();
        this.gender = this.localStorageService.getGender() || false;

        // Get current user ID and load data from API
        this.currentUserId = this.userDetails?.User_ID || null;
        if (this.currentUserId) {
            this.loadUserDetailsFromAPI();
            this.loadContactInfo();
        }
    }

    ngOnDestroy(): void {
        this.subscriptions.forEach((sub) => sub.unsubscribe());
    }

    loadUserData(): void {
        this.userDetails = this.localStorageService.getUserDetails();
        this.accountDetails = this.localStorageService.getAccountDetails();
        this.entityDetails = this.localStorageService.getEntityDetails();
        this.accountSettings = this.localStorageService.getAccountSettings();

        this.isRegional = this.accountSettings?.Language !== 'English';
    }

    loadUserDetailsFromAPI(): void {
        if (!this.currentUserId) {
            return;
        }

        const sub = this.profileApiService.getUserDetails(this.currentUserId).subscribe({
            next: (response: any) => {
                if (!response?.success) {
                    this.handleBusinessError('update', response);
                    return;
                }

                const userData = response?.message || {};
                const firstName = this.isRegional ? (userData?.First_Name_Regional || userData?.First_Name || '') : (userData?.First_Name || '');
                const middleName = this.isRegional ? (userData?.Middle_Name_Regional || userData?.Middle_Name || '') : (userData?.Middle_Name || '');
                const lastName = this.isRegional ? (userData?.Last_Name_Regional || userData?.Last_Name || '') : (userData?.Last_Name || '');
                const prefix = this.isRegional ? (userData?.Prefix_Regional || userData?.Prefix || '') : (userData?.Prefix || '');
                const gender = userData?.Gender !== undefined ? Boolean(userData.Gender) : (this.userDetails?.Gender || false);

                this.profileForm.patchValue({
                    First_Name: firstName,
                    Middle_Name: middleName,
                    Last_Name: lastName,
                    Prefix: prefix,
                    Gender: gender
                });

                // Update userDetails in memory
                if (this.userDetails) {
                    this.userDetails.First_Name = userData?.First_Name || '';
                    this.userDetails.Middle_Name = userData?.Middle_Name || '';
                    this.userDetails.Last_Name = userData?.Last_Name || '';
                    this.userDetails.Prefix = userData?.Prefix || '';
                    this.userDetails.Gender = gender;

                    // Also update regional fields if available
                    this.userDetails.First_Name_Regional = userData?.First_Name_Regional || '';
                    this.userDetails.Middle_Name_Regional = userData?.Middle_Name_Regional || '';
                    this.userDetails.Last_Name_Regional = userData?.Last_Name_Regional || '';
                    this.userDetails.Prefix_Regional = userData?.Prefix_Regional || '';

                    // Update localStorage to persist the changes
                    this.localStorageService.setItem('User_Details', this.userDetails);

                    // Sync user name with service to update top bar in real-time
                    this.syncUserName();
                }
            }
        });

        this.subscriptions.push(sub);
    }

    initFormModels() {
        const firstName = this.getFirstName();
        const lastName = this.getLastName();
        const middleName = this.getMiddleName();
        const prefix = this.getPrefix();
        const email = this.accountDetails?.Email || '';
        const description = this.accountDetails?.Description || '';
        const entityName = this.entityDetails?.Name || '';
        const entityCode = this.entityDetails?.Code || '';
        const entityDescription = this.entityDetails?.Description || '';
        const gender = this.userDetails?.Gender !== undefined ? this.userDetails.Gender : null;
        const accountId = this.accountDetails?.Account_ID || null;
        const userId = this.userDetails?.User_ID || null;
        const entityId = this.entityDetails?.Entity_ID || null;
        const accountState = this.accountDetails?.Account_State || null;

        this.profileForm = this.fb.group({
            First_Name: [firstName, [Validators.required, nameFieldValidator()]],
            Middle_Name: [middleName, [nameFieldValidator()]],
            Last_Name: [lastName, [Validators.required, nameFieldValidator()]],
            Prefix: [prefix, [textFieldValidator()]],
            Email: [email, [Validators.required, Validators.email]],
            Description: [description],
            Gender: [gender, [Validators.required]],
            Account_ID: [accountId],
            User_ID: [userId],
            Entity_ID: [entityId],
            Account_State: [accountState],
            Entity_Name: [entityName],
            Entity_Code: [entityCode],
            Entity_Description: [entityDescription]
        });
    }

    initContactInfoForm(): void {
        this.contactInfoForm = this.fb.group({
            address: [''],
            phoneNumbers: this.fb.array([]),
            linkedinPage: ['',],
            facebookPage: ['',],
            instagramPage: ['',],
            twitterPage: ['',]
        });
    }

    get phoneNumbersFormArray(): FormArray {
        return this.contactInfoForm.get('phoneNumbers') as FormArray;
    }

    addPhoneNumber(): void {
        const phoneGroup = this.fb.group({
            number: ['', [Validators.required, Validators.pattern(/^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/)]]
        });
        this.phoneNumbersFormArray.push(phoneGroup);
    }

    removePhoneNumber(index: number): void {
        // Ensure at least one phone number remains
        if (this.phoneNumbersFormArray.length > 1) {
            this.phoneNumbersFormArray.removeAt(index);
        }
    }

    saveProfileInfo(): void {
        if (!this.currentUserId) {
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'User ID not found.'
            });
            return;
        }

        if (this.profileForm.invalid || this.saving) {
            if (this.profileForm.get('First_Name')?.invalid || this.profileForm.get('Last_Name')?.invalid) {
                this.messageService.add({
                    severity: 'warn',
                    summary: 'Validation',
                    detail: 'Please fill in all required fields correctly.'
                });
            }
            return;
        }

        this.saving = true;
        const { First_Name, Middle_Name, Last_Name, Prefix, Gender } = this.profileForm.value;

        const sub = this.profileApiService.updateUserDetails(
            this.currentUserId,
            First_Name?.trim() || '',
            Middle_Name?.trim() || '',
            Last_Name?.trim() || '',
            Prefix?.trim() || '',
            this.isRegional,
            Gender !== undefined ? Gender : true
        ).subscribe({
            next: (response: any) => {
                this.saving = false;
                if (!response?.success) {
                    this.handleBusinessError('update', response);
                    return;
                }

                this.messageService.add({
                    severity: 'success',
                    summary: this.translate.getInstant('shared.messages.success'),
                    detail: this.translate.getInstant('profile.messages.saveSuccess')
                });

                // Sync user name with service to update top bar in real-time
                this.syncUserName();

                // Reload user data (this will also update localStorage)
                this.loadUserDetailsFromAPI();
            },
            error: () => {
                this.saving = false;
            }
        });

        this.subscriptions.push(sub);
    }

    getFirstName(): string {
        if (!this.userDetails) return '';

        if (this.isRegional) {
            const firstNameRegional = this.userDetails.First_Name_Regional || '';
            if (firstNameRegional.trim()) {
                return firstNameRegional;
            }
        }
        return this.userDetails.First_Name || '';
    }

    getLastName(): string {
        if (!this.userDetails) return '';

        if (this.isRegional) {
            const lastNameRegional = this.userDetails.Last_Name_Regional || '';
            if (lastNameRegional.trim()) {
                return lastNameRegional;
            }
        }
        return this.userDetails.Last_Name || '';
    }

    getMiddleName(): string {
        if (!this.userDetails) return '';

        if (this.isRegional) {
            const middleNameRegional = this.userDetails.Middle_Name_Regional || '';
            if (middleNameRegional.trim()) {
                return middleNameRegional;
            }
        }
        return this.userDetails.Middle_Name || '';
    }

    getPrefix(): string {
        if (!this.userDetails) return '';

        if (this.isRegional) {
            const prefixRegional = this.userDetails.Prefix_Regional || '';
            if (prefixRegional.trim()) {
                return prefixRegional;
            }
        }
        return this.userDetails.Prefix || '';
    }

    loadContactInfo(): void {
        if (!this.currentUserId) {
            return;
        }

        this.loadingContactInfo = true;
        const sub = this.profileApiService.getUserContactInfo(this.currentUserId).subscribe({
            next: (response: any) => {
                this.loadingContactInfo = false;
                if (!response?.success) {
                    return;
                }

                console.log('loadContactInfo', response);
                const contactData = response?.message || {};
                const address = this.isRegional ? (contactData?.Address_Regional || contactData?.Address || '') : (contactData?.Address || '');
                const phoneNumbers = contactData?.Phone_Numbers || [];

                this.contactInfoForm.patchValue({
                    address: address,
                    linkedinPage: contactData?.Linkedin_Page || '',
                    facebookPage: contactData?.Facebook_Page || '',
                    instagramPage: contactData?.Instagram_Page || '',
                    twitterPage: contactData?.Twitter_Page || ''
                });

                // Clear existing phone numbers and add loaded ones
                while (this.phoneNumbersFormArray.length !== 0) {
                    this.phoneNumbersFormArray.removeAt(0);
                }
                phoneNumbers.forEach((phone: string) => {
                    const phoneGroup = this.fb.group({
                        number: [phone, [Validators.required, Validators.pattern(/^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/)]]
                    });
                    this.phoneNumbersFormArray.push(phoneGroup);
                });

                // If no phone numbers, add one empty field
                if (this.phoneNumbersFormArray.length === 0) {
                    this.addPhoneNumber();
                }

                this.userContactInfo = {
                    address: address,
                    phoneNumbers: phoneNumbers,
                    linkedinPage: contactData?.Linkedin_Page || '',
                    facebookPage: contactData?.Facebook_Page || '',
                    instagramPage: contactData?.Instagram_Page || '',
                    twitterPage: contactData?.Twitter_Page || ''
                };
            },
            error: () => {
                this.loadingContactInfo = false;
            }
        });

        this.subscriptions.push(sub);
    }

    saveContactInfo(): void {
        if (!this.currentUserId) {
            return;
        }

        // if (this.contactInfoForm.invalid || this.savingContactInfo) {
        //     this.messageService.add({
        //         severity: 'warn',
        //         summary: 'Validation',
        //         detail: 'Please fill in all fields correctly.'
        //     });
        // }

        this.savingContactInfo = true;
        const { address, phoneNumbers, linkedinPage, facebookPage, instagramPage, twitterPage } = this.contactInfoForm.value;

        // Extract phone numbers from form array
        const phoneNumbersArray = phoneNumbers.map((phoneGroup: any) => phoneGroup.number).filter((phone: string) => phone && phone.trim() !== '');

        const sub = this.profileApiService.updateUserContactInfo(
            this.currentUserId,
            address?.trim() || '',
            this.isRegional,
            phoneNumbersArray,
            linkedinPage?.trim() || '',
            facebookPage?.trim() || '',
            instagramPage?.trim() || '',
            twitterPage?.trim() || ''
        ).subscribe({
            next: (response: any) => {
                this.savingContactInfo = false;
                if (!response?.success) {
                    this.handleBusinessError('contact', response);
                    return;
                }

                this.messageService.add({
                    severity: 'success',
                    summary: 'Success',
                    detail: 'Contact information updated successfully.'
                });

                this.loadContactInfo();
            },
            error: () => {
                this.savingContactInfo = false;
            }
        });

        this.subscriptions.push(sub);
    }

    getPhoneNumberError(index: number): string {
        const phoneControl = this.phoneNumbersFormArray.at(index)?.get('number');
        if (phoneControl?.errors?.['required']) {
            return 'Phone number is required.';
        }
        if (phoneControl?.errors?.['pattern']) {
            return 'Please enter a valid phone number.';
        }
        return '';
    }

    getFirstNameError(): string {
        return getNameFieldError(this.profileForm.get('First_Name'), 'First name', false);
    }

    getLastNameError(): string {
        return getNameFieldError(this.profileForm.get('Last_Name'), 'Last name', false);
    }

    getMiddleNameError(): string {
        return getNameFieldError(this.profileForm.get('Middle_Name'), 'Middle name', false);
    }

    getPrefixError(): string {
        return getTextFieldError(this.profileForm.get('Prefix'), 'Prefix', false);
    }

    getAddressError(): string {
        return getTextFieldError(this.contactInfoForm.get('address'), 'Address', false);
    }

    navigateBack(): void {
        this.router.navigate(['/summary/profile']);
    }

    /**
     * Sync user name with UserNameService and update localStorage
     * This ensures all components (top bar) are updated in real-time
     */
    private syncUserName(): void {
        if (!this.userDetails) return;

        const isRegional = this.accountSettings?.Language !== 'English';
        let displayName = '';

        if (isRegional) {
            const firstNameRegional = this.userDetails.First_Name_Regional || '';
            const lastNameRegional = this.userDetails.Last_Name_Regional || '';
            displayName = (firstNameRegional + ' ' + lastNameRegional).trim();
        }

        const firstNameEnglish = this.userDetails.First_Name || '';
        const lastNameEnglish = this.userDetails.Last_Name || '';
        const englishName = (firstNameEnglish + ' ' + lastNameEnglish).trim();

        if (isRegional && displayName) {
            this.userNameService.updateUserName(displayName);
        } else if (englishName) {
            this.userNameService.updateUserName(englishName);
        } else {
            this.userNameService.updateUserName(this.accountDetails?.Email || 'User');
        }

        console.log('ProfileEdit: syncUserName called, userDetails:', this.userDetails);

        // Update localStorage to persist the changes
        this.localStorageService.setItem('User_Details', this.userDetails);
    }

    private handleBusinessError(context: ProfileContext, response: any): void | null {
        const code = String(response?.message || '');
        let detail = '';

        switch (context) {
            case 'update':
                detail = this.getUpdateErrorMessage(code) || '';
                break;
            case 'contact':
                detail = this.getContactErrorMessage(code) || '';
                break;
            case 'preferences':
                return null;
            default:
                return null;
        }

        if (detail) {
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail
            });
        }
        return null;
    }

    private getUpdateErrorMessage(code: string): string | null {
        switch (code) {
            case 'ERP11190':
                return 'Invalid User ID';
            case 'ERP11180':
                return 'Invalid format for First Name';
            case 'ERP11181':
                return 'Invalid format for Last Name';
            case 'ERP11182':
                return 'Invalid format for Middle Name';
            case 'ERP11183':
                return 'Invalid format for Prefix';
            default:
                return null;
        }
    }

    private getContactErrorMessage(code: string): string | null {
        switch (code) {
            case 'ERP11190':
                return 'Invalid User ID';
            case 'ERP11191':
                return 'Invalid format for one or more of the Phone Numbers';
            case 'ERP11192':
                return 'Invalid link for the LinkedIn Page';
            case 'ERP11193':
                return 'Invalid link for the Facebook Page';
            case 'ERP11194':
                return 'Invalid link for the Instagram Page';
            case 'ERP11195':
                return 'Invalid link for the Twitter Page';
            default:
                return null;
        }
    }

}

