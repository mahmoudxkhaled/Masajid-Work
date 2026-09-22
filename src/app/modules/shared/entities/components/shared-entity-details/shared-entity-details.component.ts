import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { FileUpload } from 'primeng/fileupload';
import { Subscription } from 'rxjs';
import { EntitiesService } from 'src/app/modules/entity-administration/entities/services/entities.service';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';
import { EntityDetailsRefreshService } from 'src/app/core/services/entity-details-refresh.service';
import { PermissionService } from 'src/app/core/services/permission.service';
import { Roles } from 'src/app/core/models/system-roles';
import { IEntityDetails } from 'src/app/core/models/account-status.model';
import { AuthService } from 'src/app/modules/auth/services/auth.service';
import { TranslateService } from '@ngx-translate/core';
import { EntityExtraDataService } from 'src/app/modules/donation-process/services/entity-extra-data.service';
import {
    EntityProfileLabelType,
    entityTypeIdToProfileLabelType,
    getEntityDetailsLabelKey,
    masajidUserTypeToProfileLabelType,
} from 'src/app/core/utils/entity-profile-label.util';

@Component({
    selector: 'app-shared-entity-details',
    templateUrl: './shared-entity-details.component.html',
    styleUrls: ['./shared-entity-details.component.scss']
})
export class SharedEntityDetailsComponent implements OnInit, OnDestroy {
    @ViewChild('photoUploader') photoUploader?: FileUpload;

    entityId: string = '';
    loading: boolean = false;
    loadingDetails: boolean = false;
    loadingPhoto: boolean = false;
    photoAwaitingApi: boolean = false;

    entityDetails: any = null;
    entityPhotoUrl: string = 'assets/media/upload-photo.jpg';
    hasPhoto: boolean = false;

    canManageEntityPhoto = false;
    canEditEntityDetails = false;
    entityProfileLabelType: EntityProfileLabelType = 'default';

    private subscriptions: Subscription[] = [];
    private getEntityPhotoSub?: Subscription;
    private currentEntityId: string = '';

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private entitiesService: EntitiesService,
        private messageService: MessageService,
        private localStorageService: LocalStorageService,
        private entityDetailsRefreshService: EntityDetailsRefreshService,
        private permissionService: PermissionService,
        private authService: AuthService,
        private translate: TranslateService,
        private entityExtraDataService: EntityExtraDataService,
    ) {}

    ngOnInit(): void {
        this.canManageEntityPhoto =
            this.permissionService.can('Assign_Entity_Photo') &&
            this.permissionService.can('Remove_Entity_Photo');
        this.canEditEntityDetails = this.permissionService.can('Update_Entity_Details');
        this.bindEntityIdFromRoute();
    }

    private bindEntityIdFromRoute(): void {
        const sub = this.route.paramMap.subscribe((params) => {
            const nextId = String(params.get('id') || '').trim();
            if (!nextId) {
                this.messageService.add({
                    severity: 'error',
                    summary: this.translate.instant('common.error'),
                    detail: this.translate.instant('entities.details.invalidEntityId')
                });
                this.router.navigate(['list'], { relativeTo: this.route.parent ?? this.route });
                return;
            }
            if (nextId === this.currentEntityId) {
                return;
            }
            this.currentEntityId = nextId;
            this.entityId = nextId;
            this.resetViewStateForEntityChange();
            this.loadEntityProfileLabelType();
            this.preloadEntityDetailsFromAccountStorageIfSameEntity();
            this.loadAllData();
        });
        this.subscriptions.push(sub);
    }

    private resetViewStateForEntityChange(): void {
        this.getEntityPhotoSub?.unsubscribe();
        this.entityDetails = null;
        this.loading = true;
        this.loadingDetails = true;
        this.loadingPhoto = false;
        this.photoAwaitingApi = true;
        this.entityProfileLabelType = 'default';
        this.setPlaceholderPhoto();
    }

    getDetailsLabelKey(field: 'title' | 'profile' | 'editEntity'): string {
        return getEntityDetailsLabelKey(this.entityProfileLabelType, field);
    }

    private loadEntityProfileLabelType(): void {
        const accountEntityId = String(this.localStorageService.getEntityDetails()?.Entity_ID || '');
        const cachedTypeId = this.localStorageService.getEntityTypeId();
        if (accountEntityId === this.entityId && cachedTypeId !== null) {
            this.entityProfileLabelType = entityTypeIdToProfileLabelType(cachedTypeId);
            return;
        }

        const sub = this.entityExtraDataService.getEntityExtraData(Number(this.entityId)).subscribe({
            next: (response: any) => {
                console.log('getEntityExtraData response', response);
                if (!response?.success) {
                    this.entityProfileLabelType = masajidUserTypeToProfileLabelType(
                        this.localStorageService.getMasajidUserType(),
                    );
                    return;
                }
                const mapped = this.entityExtraDataService.mapEntityExtraData(response.message || {});
                this.entityProfileLabelType = entityTypeIdToProfileLabelType(mapped.entityTypeId);
            },
            error: () => {
                this.entityProfileLabelType = masajidUserTypeToProfileLabelType(
                    this.localStorageService.getMasajidUserType(),
                );
            },
        });
        this.subscriptions.push(sub);
    }

    ngOnDestroy(): void {
        this.getEntityPhotoSub?.unsubscribe();
        this.subscriptions.forEach((sub) => sub.unsubscribe());
    }

    loadAllData(): void {
        const hadPreload = !!this.entityDetails;
        if (!hadPreload) {
            this.loading = true;
            this.loadingDetails = true;
        }

        const sub = this.entitiesService.getEntityDetails(this.entityId).subscribe({
            next: (response: any) => {
                console.log('getEntityDetails response', response);
                if (!response?.success) {
                    this.handleBusinessError('details', response);
                    this.loading = false;
                    this.loadingDetails = false;
                    this.photoAwaitingApi = false;
                    return;
                }
                this.entityDetails = response?.message || {};
                this.loadingDetails = false;
                this.loading = false;
                this.notifyTopBarIfCurrentOrParentEntity();
            }
        });

        this.subscriptions.push(sub);
        this.loadPhoto();
    }

    private preloadEntityDetailsFromAccountStorageIfSameEntity(): void {
        const stored = this.localStorageService.getEntityDetails() as IEntityDetails | null;
        if (!stored || String(stored.Entity_ID) !== this.entityId) {
            return;
        }
        this.entityDetails = { ...stored };
        this.loading = false;
        this.loadingDetails = false;
    }

    private notifyTopBarIfCurrentOrParentEntity(): void {
        if (this.isCurrentOrParentAccountEntity()) {
            this.entityDetailsRefreshService.requestRefresh();
        }
    }

    loadPhoto(): void {
        this.getEntityPhotoSub?.unsubscribe();
        this.photoAwaitingApi = true;
        const entityIdForRequest = this.entityId;
        const sub = this.entitiesService.getEntityPhoto(this.entityId).subscribe({
            next: (response: any) => {
                if (entityIdForRequest !== this.entityId) {
                    return;
                }
                if (response?.success && response?.message) {
                    const parsed = this.entitiesService.parseEntityPhotoMessage(response.message);
                    if (parsed) {
                        this.entityPhotoUrl = `data:image/${parsed.imageFormat.toLowerCase()};base64,${parsed.imageBase64}`;
                        this.hasPhoto = true;
                    } else {
                        this.setPlaceholderPhoto();
                    }
                } else {
                    this.setPlaceholderPhoto();
                }
                this.loadingPhoto = false;
                this.photoAwaitingApi = false;
                this.notifyTopBarIfCurrentOrParentEntity();
            },
            error: () => {
                if (entityIdForRequest !== this.entityId) {
                    return;
                }
                this.entityPhotoUrl = 'assets/media/upload-photo.jpg';
                this.hasPhoto = false;
                this.loadingPhoto = false;
                this.photoAwaitingApi = false;
            }
        });

        this.getEntityPhotoSub = sub;
        this.subscriptions.push(sub);
    }

    private setPlaceholderPhoto(): void {
        this.entityPhotoUrl = 'assets/media/upload-photo.jpg';
        this.hasPhoto = false;
    }

    getEntityName(): string {
        if (!this.entityDetails) return '';
        return this.localStorageService.pickRequestContentField(
            String(this.entityDetails.Name || this.entityDetails.name || ''),
            String(this.entityDetails.Name_Regional || this.entityDetails.name_Regional || ''),
        );
    }

    getEntityDescription(): string {
        if (!this.entityDetails) return '';
        return this.localStorageService.pickRequestContentField(
            String(this.entityDetails.Description || this.entityDetails.description || ''),
            String(this.entityDetails.Description_Regional || this.entityDetails.description_Regional || ''),
        );
    }

    getEntityCode(): string {
        if (!this.entityDetails) return '';
        return this.entityDetails.Code || this.entityDetails.code || '';
    }

    getStatusLabel(): string {
        if (!this.entityDetails) return 'Unknown';
        const isActive = this.entityDetails.Is_Active !== undefined
            ? this.entityDetails.Is_Active
            : (this.entityDetails.is_Active || this.entityDetails.active || false);
        return isActive ? 'Active' : 'Inactive';
    }

    getStatusSeverity(): 'success' | 'danger' {
        if (!this.entityDetails) return 'danger';
        const isActive = this.entityDetails.Is_Active !== undefined
            ? this.entityDetails.Is_Active
            : (this.entityDetails.is_Active || this.entityDetails.active || false);
        return isActive ? 'success' : 'danger';
    }

    getTypeLabel(): string {
        if (!this.entityDetails) return 'Organization';
        const isPersonal = this.entityDetails.Is_Personal !== undefined
            ? this.entityDetails.Is_Personal
            : (this.entityDetails.is_Personal || this.entityDetails.isPersonal || false);
        return isPersonal ? 'Personal' : 'Organization';
    }

    getTypeSeverity(): 'warning' | 'info' {
        if (!this.entityDetails) return 'info';
        const isPersonal = this.entityDetails.Is_Personal !== undefined
            ? this.entityDetails.Is_Personal
            : (this.entityDetails.is_Personal || this.entityDetails.isPersonal || false);
        return isPersonal ? 'warning' : 'info';
    }

    openEditEntityDialog(): void {
        if (this.entityId) {
            this.router.navigate(['edit'], { relativeTo: this.route });
        }
    }

    onPhotoUpload(event: any): void {
        const file = event.files?.[0];
        if (!file) {
            return;
        }

        if (!file.type.startsWith('image/')) {
            this.messageService.add({
                severity: 'error',
                summary: this.translate.instant('entities.details.photo.messages.invalidFileTypeSummary'),
                detail: this.translate.instant('entities.details.photo.messages.invalidFileTypeDetail'),
                life: 5000
            });
            this.photoUploader?.clear();
            return;
        }

        const RECOMMENDED_FILE_SIZE = 200 * 1024;
        const fileSizeInMB = (file.size / (1024 * 1024)).toFixed(2);
        const recommendedSizeInKB = (RECOMMENDED_FILE_SIZE / 1024).toFixed(0);

        if (file.size > RECOMMENDED_FILE_SIZE) {
            this.messageService.add({
                severity: 'warn',
                summary: this.translate.instant('entities.details.photo.messages.largeFileSummary'),
                detail: this.translate.instant('entities.details.photo.messages.largeFileDetail', {
                    sizeMb: fileSizeInMB,
                    recommendedKb: recommendedSizeInKB
                }),
                life: 5000
            });
            this.loadingPhoto = false;
            this.photoUploader?.clear();
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            const arrayBuffer = reader.result as ArrayBuffer;
            const byteArray = new Uint8Array(arrayBuffer);
            const imageFormat = file.type.split('/')[1] || 'png';

            this.uploadPhoto(byteArray, imageFormat);
        };
        reader.onerror = () => {
            this.messageService.add({
                severity: 'error',
                summary: this.translate.instant('common.error'),
                detail: this.translate.instant('entities.details.photo.messages.readFileError'),
                life: 5000
            });
            this.photoUploader?.clear();
        };
        reader.readAsArrayBuffer(file);
    }

    uploadPhoto(byteArray: Uint8Array, imageFormat: string): void {
        this.loadingPhoto = true;

        const base64String = btoa(
            String.fromCharCode.apply(null, Array.from(byteArray))
        );

        const sub = this.entitiesService.assignEntityPhoto(
            this.entityId,
            imageFormat,
            base64String
        ).subscribe({
            next: (response: any) => {
                if (!response?.success) {
                    this.handleBusinessError('uploadPhoto', response);
                    this.photoUploader?.clear();
                    return;
                }

                this.messageService.add({
                    severity: 'success',
                    summary: this.translate.instant('common.success'),
                    detail: this.translate.instant('entities.details.photo.messages.uploaded'),
                    life: 3000
                });
                this.refreshTopBarAfterPhotoChange();
                this.loadPhoto();
            },
            error: () => {
                this.loadingPhoto = false;
                this.photoUploader?.clear();
            },
            complete: () => this.loadingPhoto = false
        });

        this.subscriptions.push(sub);
    }

    onPhotoAreaClick(): void {
        if (!this.canManageEntityPhoto || this.loadingPhoto || this.photoAwaitingApi) {
            return;
        }
        this.photoUploader?.choose();
    }

    onPhotoAreaKeydown(event: KeyboardEvent | Event): void {
        event.preventDefault();
        this.onPhotoAreaClick();
    }

    removePhoto(): void {
        this.loadingPhoto = true;
        const sub = this.entitiesService.removeEntityPhoto(this.entityId).subscribe({
            next: (response: any) => {
                if (!response?.success) {
                    this.handleBusinessError('removePhoto', response);
                    this.loadingPhoto = false;
                    return;
                }

                this.messageService.add({
                    severity: 'success',
                    summary: this.translate.instant('common.success'),
                    detail: this.translate.instant('entities.details.photo.messages.removed'),
                    life: 3000
                });
                this.refreshTopBarAfterPhotoChange();
                this.setPlaceholderPhoto();
                this.loadingPhoto = false;
                this.notifyTopBarIfCurrentOrParentEntity();
            },
            error: () => {
                this.loadingPhoto = false;
            }
        });

        this.subscriptions.push(sub);
    }

    navigateBack(): void {
        if (!this.canBackToList()) {
            this.router.navigate(['/']);
            return;
        }
        const baseRoute = this.route.parent ?? this.route;
        this.router.navigate(['list'], { relativeTo: baseRoute });
    }

    canBackToList(): boolean {
        return this.permissionService.hasAnyRole([
            Roles.Developer,
            Roles.SystemAdministrator,
        ]);
    }

    private refreshTopBarAfterPhotoChange(): void {
        if (!this.isCurrentOrParentAccountEntity()) {
            this.entityDetailsRefreshService.requestRefresh();
            return;
        }
        const email = this.localStorageService.getAccountDetails()?.Email || '';
        if (!email) {
            this.entityDetailsRefreshService.requestRefresh();
            return;
        }
        const sub = this.authService.getLoginDataPackage(email).subscribe({
            next: () => {
                this.entityDetailsRefreshService.requestRefresh();
            },
            error: () => {
                this.entityDetailsRefreshService.requestRefresh();
            }
        });
        this.subscriptions.push(sub);
    }

    private isCurrentOrParentAccountEntity(): boolean {
        const ed = this.localStorageService.getEntityDetails() as IEntityDetails | null;
        if (!ed) {
            return false;
        }
        const changedEntityId = String(this.entityId || '').trim();
        const currentEntityId = String(ed.Entity_ID ?? '').trim();
        const parentEntityId = String(ed.Parent_Entity_ID ?? '').trim();
        return changedEntityId === currentEntityId || changedEntityId === parentEntityId;
    }

    private handleBusinessError(context: string, response: any): void | null {
        const code = String(response?.message || '');
        const detail = this.getErrorMessage(context, code);

        if (detail) {
            this.messageService.add({
                severity: 'error',
                summary: this.translate.instant('common.error'),
                detail
            });
        }
        return null;
    }

    private getErrorMessage(_context: string, code: string): string | null {
        switch (code) {
            case 'DAP11260':
                return this.translate.instant('entities.details.businessErrors.DAP11260');
            case 'DAP11277':
                return this.translate.instant('entities.details.businessErrors.DAP11277');
            case 'DAP11278':
                return this.translate.instant('entities.details.businessErrors.DAP11278');
            case 'DAP11281':
                return this.translate.instant('entities.details.businessErrors.DAP11281');
            case 'DAP11282':
                return this.translate.instant('entities.details.businessErrors.DAP11282');
            case 'DAP11279':
                return this.translate.instant('entities.details.businessErrors.DAP11279');
            default:
                return null;
        }
    }
}
