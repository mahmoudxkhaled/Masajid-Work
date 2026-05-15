import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { FileUpload } from 'primeng/fileupload';
import { Subscription } from 'rxjs';
import { EntitiesService } from 'src/app/modules/entity-administration/entities/services/entities.service';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';
import { LanguageDirService } from 'src/app/core/services/language-dir.service';
import { EntityDetailsRefreshService } from 'src/app/core/services/entity-details-refresh.service';
import { ImageService } from 'src/app/core/services/image.service';
import { PermissionService } from 'src/app/core/services/permission.service';
import { IAccountSettings, IEntityDetails } from 'src/app/core/models/account-status.model';
import { AuthService } from 'src/app/modules/auth/services/auth.service';

@Component({
    selector: 'app-shared-entity-details',
    templateUrl: './shared-entity-details.component.html',
    styleUrls: ['./shared-entity-details.component.scss']
})
export class SharedEntityDetailsComponent implements OnInit, OnDestroy {
    @ViewChild('logoUploader') logoUploader?: FileUpload;

    entityId: string = '';
    loading: boolean = false;
    loadingDetails: boolean = false;
    loadingLogo: boolean = false;
    logoAwaitingApi: boolean = false;
    activeTabIndex: number = 0;

    entityDetails: any = null;
    entityLogo: string = 'assets/media/upload-photo.jpg';
    hasLogo: boolean = false;

    accountSettings: IAccountSettings;
    isRegional: boolean = false;
    requestedSystemRole: number = 0;

    canManageEntityLogo = false;
    canEditEntityDetails = false;

    private subscriptions: Subscription[] = [];
    private getEntityLogoSub?: Subscription;
    private currentEntityId: string = '';

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private entitiesService: EntitiesService,
        private messageService: MessageService,
        private localStorageService: LocalStorageService,
        private entityDetailsRefreshService: EntityDetailsRefreshService,
        private imageService: ImageService,
        private permissionService: PermissionService,
        private languageDirService: LanguageDirService,
        private authService: AuthService
    ) {
        this.accountSettings = this.localStorageService.getAccountSettings() as IAccountSettings;
        this.isRegional = this.localStorageService.getPreferredLanguageCode() === 'ar';
    }

    ngOnInit(): void {
        this.requestedSystemRole =
            this.route.snapshot.data['requestedSystemRole'] ??
            (this.localStorageService.getAccountDetails()?.System_Role_ID || 0);

        this.canManageEntityLogo =
            this.permissionService.can('Assign_Entity_Logo') &&
            this.permissionService.can('Remove_Entity_Logo');
        this.canEditEntityDetails = this.permissionService.can('Update_Entity_Details');

        this.applyTabIndexFromQuery(this.route.snapshot.queryParamMap);
        this.bindTabFromQueryParam();
        this.subscriptions.push(
            this.languageDirService.userLanguageCode$.subscribe(() => {
                this.isRegional = this.localStorageService.getPreferredLanguageCode() === 'ar';
            })
        );
        this.bindEntityIdFromRoute();
    }

    private bindEntityIdFromRoute(): void {
        const sub = this.route.paramMap.subscribe((params) => {
            const nextId = String(params.get('id') || '').trim();
            if (!nextId) {
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'Invalid entity ID.'
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
            this.preloadEntityDetailsFromAccountStorageIfSameEntity();
            this.loadAllData();
        });
        this.subscriptions.push(sub);
    }

    private resetViewStateForEntityChange(): void {
        this.getEntityLogoSub?.unsubscribe();
        this.entityDetails = null;
        this.loading = true;
        this.loadingDetails = true;
        this.loadingLogo = false;
        this.logoAwaitingApi = true;
        this.setPlaceholderLogo();
    }

    private parseTabIndex(raw: string | null): number | null {
        if (raw === null || raw === '') {
            return null;
        }
        const n = parseInt(raw, 10);
        if (Number.isNaN(n)) {
            return null;
        }
        return Math.max(0, Math.min(4, n));
    }

    private applyTabIndexFromQuery(paramMap: ParamMap): void {
        const idx = this.parseTabIndex(paramMap.get('tab'));
        if (idx !== null) {
            this.activeTabIndex = idx;
        }
    }

    private bindTabFromQueryParam(): void {
        const sub = this.route.queryParamMap.subscribe((params) => {
            const idx = this.parseTabIndex(params.get('tab'));
            if (idx !== null) {
                this.activeTabIndex = idx;
            }
        });
        this.subscriptions.push(sub);
    }

    onTabChange(index: number): void {
        this.activeTabIndex = index;
        this.router.navigate([], {
            relativeTo: this.route,
            queryParams: { tab: index },
            queryParamsHandling: 'merge',
            replaceUrl: true
        });
    }

    ngOnDestroy(): void {
        this.getEntityLogoSub?.unsubscribe();
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
                if (!response?.success) {
                    this.handleBusinessError('details', response);
                    this.loading = false;
                    this.loadingDetails = false;
                    this.logoAwaitingApi = false;
                    return;
                }
                this.entityDetails = response?.message || {};
                this.loadingDetails = false;
                this.loading = false;
                this.notifyTopBarIfCurrentOrParentEntity();
            }
        });

        this.subscriptions.push(sub);
        this.loadLogo();
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

    private isCurrentAccountEntity(): boolean {
        const ed = this.localStorageService.getEntityDetails() as IEntityDetails | null;
        return !!(ed && String(ed.Entity_ID) === this.entityId);
    }

    private notifyTopBarIfCurrentOrParentEntity(): void {
        if (this.isCurrentOrParentAccountEntity()) {
            this.entityDetailsRefreshService.requestRefresh();
        }
    }

    loadLogo(): void {
        this.getEntityLogoSub?.unsubscribe();
        this.logoAwaitingApi = true;
        const entityIdForRequest = this.entityId;
        const sub = this.entitiesService.getEntityLogo(this.entityId).subscribe({
            next: (response: any) => {
                if (entityIdForRequest !== this.entityId) {
                    return;
                }
                if (response?.success && response?.message) {
                    const logoData = response.message;
                    if (logoData?.Image && logoData.Image.trim() !== '') {
                        const imageFormat = logoData.Image_Format || 'png';
                        this.entityLogo = `data:image/${imageFormat.toLowerCase()};base64,${logoData.Image}`;
                        this.hasLogo = true;
                    } else {
                        this.setPlaceholderLogo();
                    }
                } else {
                    this.setPlaceholderLogo();
                }
                this.loadingLogo = false;
                this.logoAwaitingApi = false;
                this.notifyTopBarIfCurrentOrParentEntity();
            },
            error: () => {
                if (entityIdForRequest !== this.entityId) {
                    return;
                }
                this.entityLogo = 'assets/media/upload-photo.jpg';
                this.hasLogo = false;
                this.loadingLogo = false;
                this.logoAwaitingApi = false;
            }
        });

        this.getEntityLogoSub = sub;
        this.subscriptions.push(sub);
    }

    private setPlaceholderLogo(): void {
        this.entityLogo = 'assets/media/upload-photo.jpg';
        this.hasLogo = false;
    }

    getEntityName(): string {
        if (!this.entityDetails) return '';
        return this.isRegional
            ? (this.entityDetails.Name_Regional || this.entityDetails.name_Regional || this.entityDetails.name || this.entityDetails.Name || '')
            : (this.entityDetails.Name || this.entityDetails.name || '');
    }

    getEntityDescription(): string {
        if (!this.entityDetails) return '';
        return this.isRegional
            ? (this.entityDetails.Description_Regional || this.entityDetails.description_Regional || this.entityDetails.description || this.entityDetails.Description || '')
            : (this.entityDetails.Description || this.entityDetails.description || '');
    }

    getEntityCode(): string {
        if (!this.entityDetails) return '';
        return this.entityDetails.Code || this.entityDetails.code || '';
    }

    getParentEntityLabel(): string {
        const parentId = this.entityDetails.Parent_Entity_ID;
        return parentId ? ` ${parentId}` : 'Root Entity';
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

    handleEntityUpdated(): void {
        this.loadAllData();
    }

    onLogoUpload(event: any): void {
        const file = event.files?.[0];
        if (!file) {
            return;
        }

        if (!file.type.startsWith('image/')) {
            this.messageService.add({
                severity: 'error',
                summary: 'Invalid File Type',
                detail: 'Please select an image file (JPG, PNG, JPEG, WEBP).',
                life: 5000
            });
            this.logoUploader?.clear();
            return;
        }

        const RECOMMENDED_FILE_SIZE = 200 * 1024;
        const fileSizeInMB = (file.size / (1024 * 1024)).toFixed(2);
        const recommendedSizeInKB = (RECOMMENDED_FILE_SIZE / 1024).toFixed(0);

        if (file.size > RECOMMENDED_FILE_SIZE) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Large File Size',
                detail: `File size (${fileSizeInMB}MB) is larger than recommended (${recommendedSizeInKB}KB). Upload may take longer.`,
                life: 5000
            });
            this.loadingLogo = false;
            this.logoUploader?.clear();
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            const arrayBuffer = reader.result as ArrayBuffer;
            const byteArray = new Uint8Array(arrayBuffer);
            const imageFormat = file.type.split('/')[1] || 'png';

            this.uploadLogo(byteArray, imageFormat);
        };
        reader.onerror = () => {
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Failed to read file. Please try again.',
                life: 5000
            });
            this.logoUploader?.clear();
        };
        reader.readAsArrayBuffer(file);
    }

    uploadLogo(byteArray: Uint8Array, imageFormat: string): void {
        this.loadingLogo = true;

        const base64String = btoa(
            String.fromCharCode.apply(null, Array.from(byteArray))
        );

        const sub = this.entitiesService.assignEntityLogo(
            this.entityId,
            imageFormat,
            base64String
        ).subscribe({
            next: (response: any) => {
                if (!response?.success) {
                    this.handleBusinessError('uploadLogo', response);
                    this.logoUploader?.clear();
                    return;
                }

                this.messageService.add({
                    severity: 'success',
                    summary: 'Success',
                    detail: 'Logo uploaded successfully.',
                    life: 3000
                });
                this.refreshTopBarAfterLogoChange();
                this.loadLogo();
            },
            error: () => {
                this.loadingLogo = false;
                this.logoUploader?.clear();
            },
            complete: () => this.loadingLogo = false
        });

        this.subscriptions.push(sub);
    }

    onLogoAreaClick(): void {
        if (!this.canManageEntityLogo || this.loadingLogo || this.logoAwaitingApi) {
            return;
        }
        this.logoUploader?.choose();
    }

    onLogoAreaKeydown(event: KeyboardEvent | Event): void {
        event.preventDefault();
        this.onLogoAreaClick();
    }

    removeLogo(): void {
        this.loadingLogo = true;
        const sub = this.entitiesService.removeEntityLogo(this.entityId).subscribe({
            next: (response: any) => {
                if (!response?.success) {
                    this.handleBusinessError('removeLogo', response);
                    this.loadingLogo = false;
                    return;
                }

                this.messageService.add({
                    severity: 'success',
                    summary: 'Success',
                    detail: 'Logo removed successfully.',
                    life: 3000
                });
                this.refreshTopBarAfterLogoChange();
                this.setPlaceholderLogo();
                this.loadingLogo = false;
                this.notifyTopBarIfCurrentOrParentEntity();
            },
            error: () => {
                this.loadingLogo = false;
            }
        });

        this.subscriptions.push(sub);
    }

    navigateBack(): void {
        const baseRoute = this.route.parent ?? this.route;
        this.router.navigate(['list'], { relativeTo: baseRoute });
    }

    getEntityIdAsNumber(): number {
        return Number(this.entityId) || 0;
    }

    private refreshTopBarAfterLogoChange(): void {
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
                summary: 'Error',
                detail
            });
        }
        return null;
    }

    private getErrorMessage(context: string, code: string): string | null {
        switch (code) {
            case 'ERP11260':
                return 'Invalid Entity ID';
            case 'ERP11277':
                return 'Invalid Account ID (issued if the Account ID does not exist in the database, or if an entity administrator tries to assign an account outside his entity tree)';
            case 'ERP11278':
                return 'Invalid action. The Entity Admin account must be assigned directly to the entity (i.e. the Account\'s Entity_ID must be equal to the Entity_ID)';
            case 'ERP11281':
                return 'Unknown image file format';
            case 'ERP11282':
                return 'Empty contents for Image file';
            case 'ERP11279':
                return 'Invalid Account ID. Provided ID is not part of the Entity\'s admins';
            default:
                return null;
        }
    }
}
