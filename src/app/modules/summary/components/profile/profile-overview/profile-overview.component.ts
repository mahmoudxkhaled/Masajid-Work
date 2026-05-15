import { Component, ElementRef, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { TranslationService } from 'src/app/core/services/translation.service';
import { MenuItem, MessageService } from 'primeng/api';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';
import { LanguageDirService } from 'src/app/core/services/language-dir.service';
import { LayoutService } from 'src/app/layout/app-services/app.layout.service';
import { ProfilePictureService } from 'src/app/core/services/profile-picture.service';
import { IUserDetails, IAccountDetails, IEntityDetails, IAccountSettings, IUserAccountItem } from 'src/app/core/models/account-status.model';
import { ProfileApiService } from '../../../services/profile-api.service';
import { ProfileContactInfo, ProfilePreferences } from '../../../models/profile.model';
import { RolesService } from 'src/app/modules/entity-administration/roles/services/roles.service';
import { Observable, Subscription } from 'rxjs';
import { FileUpload } from 'primeng/fileupload';

@Component({
    selector: 'app-profile-overview',
    templateUrl: './profile-overview.component.html',
    styleUrls: ['./profile-overview.component.scss'],
    providers: [MessageService]
})
export class ProfileOverviewComponent implements OnInit, OnDestroy {
    currentUserId: number | null = null;
    userDetails: IUserDetails | null = null;
    accountDetails: IAccountDetails | null = null;
    entityDetails: IEntityDetails | null = null;
    accountSettings: IAccountSettings | null = null;
    userAccounts: IUserAccountItem[] = [];
    isRegional: boolean = false;
    editAccountTitleDialogVisible: boolean = false;
    accountBeingEdited: IUserAccountItem | null = null;
    editAccountTitleValue: string = '';
    savingAccountTitle: boolean = false;
    accountDetailsDialogVisible: boolean = false;
    accountForDetails: IUserAccountItem | null = null;
    accountDetailsRoleName: string = '';
    loadingAccountDetails: boolean = false;
    profilePictureUrl: string = '';
    hasProfilePicture: boolean = false;
    uploadingPicture: boolean = false;

    showCropDialog: boolean = false;
    pendingCropDataUrl: string = '';
    pendingCropFile: File | null = null;
    pendingCropFileExtension: string = 'png';
    cropPosition: { x: number; y: number } = { x: 0, y: 0 };
    cropDisplayWidth: number = 200;
    cropDisplayHeight: number = 200;
    private cropNaturalWidth: number = 0;
    private cropNaturalHeight: number = 0;
    private isCropDragging: boolean = false;
    private lastCropMouseX: number = 0;
    private lastCropMouseY: number = 0;
    private rawContactData: any = null;
    private rawAccountRole: any = null;

    @ViewChild('profilePictureUploader') profilePictureUploader?: FileUpload;
    @ViewChild('profilePictureUploader2') profilePictureUploader2?: FileUpload;
    @ViewChild('cropImage') cropImageRef?: ElementRef<HTMLImageElement>;

    userContactInfo: ProfileContactInfo | null = null;
    userPreferences: ProfilePreferences = {};
    isLoading$: Observable<boolean>;
    loadingDetails: boolean = false;
    loadingContactInfo: boolean = false;
    loadingPreferences: boolean = false;
    loadingProfilePicture: boolean = false;

    gender: boolean = false;

    private subscriptions: Subscription[] = [];

    constructor(
        public translate: TranslationService,
        private messageService: MessageService,
        private localStorageService: LocalStorageService,
        private profileApiService: ProfileApiService,
        private profilePictureService: ProfilePictureService,
        private rolesService: RolesService,
        private router: Router,
        private languageDirService: LanguageDirService,
        private layoutService: LayoutService
    ) {
        this.isLoading$ = this.profileApiService.isLoadingSubject.asObservable();
    }

    ngOnInit(): void {
        this.loadUserData();
        this.subscriptions.push(
            this.languageDirService.userLanguageCode$.subscribe(() => {
                this.isRegional = this.localStorageService.getPreferredLanguageCode() === 'ar';
                this.mapRawContactInfo();
                this.mapRawAccountRole();
            })
        );
        this.gender = this.localStorageService.getGender() || false;

        // Get current user ID and load data from API
        this.currentUserId = this.userDetails?.User_ID || null;
        if (this.currentUserId) {
            this.loadAllData();
        } else {
            // Fallback to localStorage profile picture
            if (this.gender) {
                this.profilePictureUrl = this.accountDetails?.Profile_Picture || 'assets/media/avatar.png';
            } else {
                this.profilePictureUrl = this.accountDetails?.Profile_Picture || 'assets/media/female-avatar.png';
            }
        }
    }

    ngOnDestroy(): void {
        this.subscriptions.forEach((sub) => sub.unsubscribe());
    }

    getDefaultAvatarUrl(): string {
        return this.layoutService.getDefaultAvatarPath(this.gender);
    }

    loadUserData(): void {
        this.userDetails = this.localStorageService.getUserDetails();
        this.accountDetails = this.localStorageService.getAccountDetails();
        this.entityDetails = this.localStorageService.getEntityDetails();
        this.accountSettings = this.localStorageService.getAccountSettings();
        const accounts = this.localStorageService.getUserAccounts();
        this.userAccounts = accounts || [];

        this.isRegional = this.localStorageService.getPreferredLanguageCode() === 'ar';
    }

    getEntityNameForAccount(entityId: number): string {
        if (this.entityDetails?.Entity_ID === entityId) {
            return this.isRegional ? (this.entityDetails.Name_Regional || this.entityDetails.Name || '') : (this.entityDetails.Name || '—');
        }
        return entityId.toString();
    }

    loadAllData(): void {
        this.loadUserDetails();
        this.loadContactInfo();
        this.loadPreferences();
        this.loadProfilePicture();
    }

    loadUserDetails(): void {
        if (!this.currentUserId) {
            return;
        }

        this.loadingDetails = true;
        const sub = this.profileApiService.getUserDetails(this.currentUserId).subscribe({
            next: (response: any) => {
                console.log('loadUserDetails', response);
                this.loadingDetails = false;
                if (!response?.success) {
                    return;
                }

                const userData = response?.message || {};
                // Update userDetails in memory
                if (this.userDetails) {
                    this.userDetails.First_Name = userData?.First_Name || '';
                    this.userDetails.Middle_Name = userData?.Middle_Name || '';
                    this.userDetails.Last_Name = userData?.Last_Name || '';
                    this.userDetails.Prefix = userData?.Prefix || '';
                    this.userDetails.Gender = userData?.Gender !== undefined ? Boolean(userData.Gender) : (this.userDetails.Gender || false);
                }
            },
            error: () => {
                this.loadingDetails = false;
            }
        });

        this.subscriptions.push(sub);
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

                this.rawContactData = response?.message || {};
                this.mapRawContactInfo();
            },
            error: () => {
                this.loadingContactInfo = false;
            }
        });

        this.subscriptions.push(sub);
    }

    loadPreferences(): void {
        if (!this.currentUserId) {
            return;
        }

        this.loadingPreferences = true;
        const sub = this.profileApiService.getUserPreferences(this.currentUserId).subscribe({
            next: (response: any) => {
                this.loadingPreferences = false;
                if (!response?.success) {
                    return;
                }

                this.userPreferences = response?.message?.User_Preferences || {};
            },
            error: () => {
                this.loadingPreferences = false;
            }
        });

        this.subscriptions.push(sub);
    }

    loadProfilePicture(): void {
        if (!this.currentUserId) {
            return;
        }

        this.loadingProfilePicture = true;
        const sub = this.profileApiService.getProfilePicture(this.currentUserId).subscribe({
            next: (response: any) => {
                this.loadingProfilePicture = false;
                if (response?.success && response?.message) {
                    const pictureData = response.message;
                    if (pictureData?.Image && pictureData.Image.trim() !== '') {
                        const imageFormat = pictureData.Image_Format || 'png';
                        this.profilePictureUrl = `data:image/${imageFormat.toLowerCase()};base64,${pictureData.Image}`;
                        this.hasProfilePicture = true;
                    } else {
                        this.profilePictureUrl = this.gender ? 'assets/media/avatar.png' : 'assets/media/female-avatar.png';
                        this.hasProfilePicture = false;
                    }
                } else {
                    this.profilePictureUrl = this.gender ? 'assets/media/avatar.png' : 'assets/media/female-avatar.png';
                    this.hasProfilePicture = false;
                }
                this.syncProfilePicture(this.profilePictureUrl);
            },
            error: () => {
                this.loadingProfilePicture = false;
                this.profilePictureUrl = this.gender ? 'assets/media/avatar.png' : 'assets/media/female-avatar.png';
                this.hasProfilePicture = false;
                this.syncProfilePicture(this.profilePictureUrl);
            }
        });

        this.subscriptions.push(sub);
    }

    private syncProfilePicture(pictureUrl: string): void {
        this.profilePictureService.updateProfilePicture(pictureUrl);
        if (this.accountDetails) {
            this.accountDetails.Profile_Picture = pictureUrl;
            this.localStorageService.setItem('Account_Details', this.accountDetails);
        }
    }

    onProfilePictureAreaClick(): void {
        if (this.uploadingPicture) return;
        (this.profilePictureUploader ?? this.profilePictureUploader2)?.choose();
    }

    onProfilePictureKeydown(event: KeyboardEvent | Event): void {
        event.preventDefault();
        this.onProfilePictureAreaClick();
    }

    uploadProfilePicture(event: any): void {
        if (!this.currentUserId) return;
        const file = event.files?.[0];
        if (!file) return;

        const validFormats = ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'tiff', 'pict'];
        const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';
        if (!validFormats.includes(fileExtension)) {
            this.messageService.add({
                severity: 'error',
                summary: this.translate.getInstant('shared.messages.error'),
                detail: this.translate.getInstant('profile.edit.invalidImageFormat')
            });
            this.profilePictureUploader?.clear();
            this.profilePictureUploader2?.clear();
            return;
        }
        if (file.size > 2097152) {
            this.messageService.add({
                severity: 'error',
                summary: this.translate.getInstant('shared.messages.error'),
                detail: this.translate.getInstant('profile.edit.imageSizeMax')
            });
            this.profilePictureUploader?.clear();
            this.profilePictureUploader2?.clear();
            return;
        }
        const oneMB = 1024 * 1024;
        if (file.size > oneMB) {
            this.messageService.add({
                severity: 'warn',
                summary: this.translate.getInstant('profile.edit.largeFile'),
                detail: this.translate.getInstant('profile.edit.largeFileDetail'),
                life: 5000
            });
        }

        this.pendingCropFile = file;
        this.pendingCropFileExtension = fileExtension;
        const reader = new FileReader();
        reader.onload = () => {
            this.pendingCropDataUrl = reader.result as string;
            this.cropPosition = { x: 0, y: 0 };
            this.cropDisplayWidth = 200;
            this.cropDisplayHeight = 200;
            this.showCropDialog = true;
        };
        reader.onerror = () => {
            this.messageService.add({
                severity: 'error',
                summary: this.translate.getInstant('shared.messages.error'),
                detail: this.translate.getInstant('profile.edit.readFileError'),
                life: 5000
            });
            this.profilePictureUploader?.clear();
            this.profilePictureUploader2?.clear();
        };
        reader.readAsDataURL(file);
        this.profilePictureUploader?.clear();
        this.profilePictureUploader2?.clear();
    }

    onCropImageLoad(event: Event): void {
        const img = event.target as HTMLImageElement;
        if (!img?.naturalWidth) return;
        this.cropNaturalWidth = img.naturalWidth;
        this.cropNaturalHeight = img.naturalHeight;
        const size = 200;
        const scale = size / Math.min(img.naturalWidth, img.naturalHeight);
        this.cropDisplayWidth = Math.round(img.naturalWidth * scale);
        this.cropDisplayHeight = Math.round(img.naturalHeight * scale);
        this.cropPosition = {
            x: (size - this.cropDisplayWidth) / 2,
            y: (size - this.cropDisplayHeight) / 2
        };
    }

    onCropMouseDown(event: MouseEvent): void {
        this.isCropDragging = true;
        this.lastCropMouseX = event.clientX;
        this.lastCropMouseY = event.clientY;
    }

    onCropMouseMove(event: MouseEvent): void {
        if (!this.isCropDragging) return;
        const dx = event.clientX - this.lastCropMouseX;
        const dy = event.clientY - this.lastCropMouseY;
        this.lastCropMouseX = event.clientX;
        this.lastCropMouseY = event.clientY;
        const size = 200;
        const maxX = 0;
        const minX = size - this.cropDisplayWidth;
        const maxY = 0;
        const minY = size - this.cropDisplayHeight;
        this.cropPosition.x = Math.max(minX, Math.min(maxX, this.cropPosition.x + dx));
        this.cropPosition.y = Math.max(minY, Math.min(maxY, this.cropPosition.y + dy));
    }

    onCropMouseUp(): void {
        this.isCropDragging = false;
    }

    closeCropDialog(): void {
        this.showCropDialog = false;
        this.pendingCropDataUrl = '';
        this.pendingCropFile = null;
    }

    onCropDialogHide(): void {
        this.closeCropDialog();
    }

    applyCropAndUpload(): void {
        const img = this.cropImageRef?.nativeElement as HTMLImageElement | undefined;
        if (!img || !this.pendingCropDataUrl || !this.currentUserId) return;
        const size = 200;
        const ctx = document.createElement('canvas').getContext('2d');
        if (!ctx) return;
        const canvas = ctx.canvas;
        canvas.width = size;
        canvas.height = size;
        const x = this.cropPosition.x;
        const y = this.cropPosition.y;
        const dw = this.cropDisplayWidth;
        const dh = this.cropDisplayHeight;
        const nw = this.cropNaturalWidth;
        const nh = this.cropNaturalHeight;
        const sx = (-x / dw) * nw;
        const sy = (-y / dh) * nh;
        const sw = (size / dw) * nw;
        const sh = (size / dh) * nh;
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, size / 2, 0, 2 * Math.PI);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, size, size);
        const dataUrl = canvas.toDataURL('image/png');
        const base64String = dataUrl.split(',')[1];
        if (!base64String) return;
        this.uploadingPicture = true;
        this.closeCropDialog();
        const sub = this.profileApiService.assignProfilePicture(this.currentUserId, 'png', base64String).subscribe({
            next: (response: any) => {
                this.uploadingPicture = false;
                if (!response?.success) {
                    this.messageService.add({
                        severity: 'error',
                        summary: this.translate.getInstant('shared.messages.error'),
                        detail: response?.message || this.translate.getInstant('profile.messages.pictureUpdateFailed')
                    });
                    return;
                }
                this.messageService.add({
                    severity: 'success',
                    summary: this.translate.getInstant('shared.messages.success'),
                    detail: this.translate.getInstant('profile.messages.pictureUpdated'),
                    life: 3000
                });
                this.loadProfilePicture();
            },
            error: () => {
                this.uploadingPicture = false;
            }
        });
        this.subscriptions.push(sub);
    }

    removeProfilePicture(): void {
        if (!this.currentUserId) return;
        this.uploadingPicture = true;
        const sub = this.profileApiService.removeProfilePicture(this.currentUserId).subscribe({
            next: (response: any) => {
                this.uploadingPicture = false;
                if (!response?.success) {
                    this.messageService.add({
                        severity: 'error',
                        summary: this.translate.getInstant('shared.messages.error'),
                        detail: this.translate.getInstant('profile.messages.pictureRemoveFailed')
                    });
                    return;
                }
                this.messageService.add({
                    severity: 'success',
                    summary: this.translate.getInstant('shared.messages.success'),
                    detail: this.translate.getInstant('profile.messages.pictureRemoved'),
                    life: 3000
                });
                this.profilePictureUrl = this.gender ? 'assets/media/avatar.png' : 'assets/media/female-avatar.png';
                this.hasProfilePicture = false;
                this.syncProfilePicture(this.profilePictureUrl);
            },
            error: () => {
                this.uploadingPicture = false;
            }
        });
        this.subscriptions.push(sub);
    }

    navigateToEdit(): void {
        this.router.navigate(['/summary/profile/edit']);
    }

    navigateToPreferences(): void {
        this.router.navigate(['/summary/profile/preferences']);
    }

    getUserDisplayName(): string {
        if (!this.userDetails) return '';
        const parts = [
            this.getPrefix(),
            this.getFirstName(),
            this.getMiddleName(),
            this.getLastName()
        ].filter(p => p && p.trim() !== '');
        return parts.join(' ') || `User #${this.userDetails.User_ID}`;
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

    getGenderLabel(): string {
        return this.userDetails?.Gender ? 'Male' : 'Female';
    }

    getStatusLabel(): string {
        return this.accountDetails?.Account_State === 1 ? 'Active' : 'Inactive';
    }

    getStatusSeverity(): string {
        return this.accountDetails?.Account_State === 1 ? 'success' : 'danger';
    }

    getPreferenceKeys(): string[] {
        return Object.keys(this.userPreferences);
    }

    openSocialLink(url: string): void {
        if (url) {
            window.open(url, '_blank');
        }
    }

    accountMenuItems: MenuItem[] = [];

    openAccountMenu(menuRef: { toggle: (e: Event) => void }, account: IUserAccountItem, event: Event): void {
        const accountCapture = account;
        this.accountMenuItems = [
            {
                label: this.translate.getInstant('profile.overview.editAccountTitle'),
                icon: 'pi pi-pencil',
                command: () => {
                    this.openEditAccountTitle(accountCapture);
                }
            },
            {
                label: this.translate.getInstant('profile.overview.viewDetails'),
                icon: 'pi pi-eye',
                command: () => {
                    this.openViewDetails(accountCapture);
                }
            }
        ];
        menuRef.toggle(event);
    }

    openEditAccountTitle(account: IUserAccountItem): void {
        this.accountBeingEdited = account;
        this.editAccountTitleValue = this.isRegional
            ? (account.Description_Regional || account.Description || '')
            : (account.Description || '');
        this.editAccountTitleDialogVisible = true;
    }

    openViewDetails(account: IUserAccountItem): void {
        this.accountForDetails = account;
        this.accountDetailsDialogVisible = true;
        this.accountDetailsRoleName = '';
        this.loadingAccountDetails = true;
        const sub = this.rolesService.getEntityRoleDetails(account.Entity_Role_ID).subscribe({
            next: (response: any) => {
                this.loadingAccountDetails = false;
                this.rawAccountRole = response?.message || {};
                this.mapRawAccountRole();
            },
            error: () => {
                this.loadingAccountDetails = false;
            }
        });
        this.subscriptions.push(sub);
    }

    closeAccountDetailsDialog(): void {
        this.accountDetailsDialogVisible = false;
        this.accountForDetails = null;
        this.accountDetailsRoleName = '';
        this.rawAccountRole = null;
    }

    private mapRawContactInfo(): void {
        if (!this.rawContactData) {
            return;
        }

        this.userContactInfo = {
            address: this.isRegional
                ? (this.rawContactData?.Address_Regional || this.rawContactData?.Address || '')
                : (this.rawContactData?.Address || ''),
            phoneNumbers: this.rawContactData?.Phone_Numbers || [],
            linkedinPage: this.rawContactData?.Linkedin_Page || '',
            facebookPage: this.rawContactData?.Facebook_Page || '',
            instagramPage: this.rawContactData?.Instagram_Page || '',
            twitterPage: this.rawContactData?.Twitter_Page || ''
        };
    }

    private mapRawAccountRole(): void {
        if (!this.rawAccountRole) {
            return;
        }

        this.accountDetailsRoleName = this.isRegional
            ? (this.rawAccountRole.Title_Regional || this.rawAccountRole.Title || '')
            : (this.rawAccountRole.Title || '');
    }

    cancelEditAccountTitle(): void {
        this.editAccountTitleDialogVisible = false;
        this.accountBeingEdited = null;
        this.editAccountTitleValue = '';
    }

    saveEditAccountTitle(): void {
        if (!this.accountBeingEdited) return;
        const email = this.accountBeingEdited.Email;
        const description = this.editAccountTitleValue.trim();
        this.savingAccountTitle = true;
        const sub = this.profileApiService.updateAccountDetails(email, description, this.isRegional).subscribe({
            next: (response: any) => {
                this.savingAccountTitle = false;
                if (response?.success) {
                    if (this.isRegional) {
                        this.accountBeingEdited!.Description_Regional = description;
                    } else {
                        this.accountBeingEdited!.Description = description;
                    }
                    this.persistUserAccounts();
                    if (this.accountDetails && this.accountDetails.Email === email) {
                        if (this.isRegional) {
                            this.accountDetails.Description_Regional = description;
                        } else {
                            this.accountDetails.Description = description;
                        }
                        this.localStorageService.setItem('Account_Details', this.accountDetails);
                    }
                    this.messageService.add({
                        severity: 'success',
                        summary: this.translate.getInstant('common.success'),
                        detail: this.translate.getInstant('profile.overview.accountTitleUpdated')
                    });
                    this.cancelEditAccountTitle();
                } else {
                    this.messageService.add({
                        severity: 'error',
                        summary: this.translate.getInstant('common.error'),
                        detail: response?.message || this.translate.getInstant('common.error')
                    });
                }
            },
            error: () => {
                this.savingAccountTitle = false;
                this.messageService.add({
                    severity: 'error',
                    summary: this.translate.getInstant('common.error'),
                    detail: this.translate.getInstant('common.error')
                });
            }
        });
        this.subscriptions.push(sub);
    }

    private persistUserAccounts(): void {
        this.localStorageService.setItem('User_Accounts', this.userAccounts);
    }
}

