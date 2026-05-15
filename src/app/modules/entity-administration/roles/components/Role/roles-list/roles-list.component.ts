import { Component, Input, OnInit, OnDestroy, OnChanges, SimpleChanges } from '@angular/core';
import { Router } from '@angular/router';
import { MenuItem, MessageService } from 'primeng/api';
import { Observable, Subscription } from 'rxjs';
import { RolesService } from '../../../services/roles.service';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';
import { LanguageDirService } from 'src/app/core/services/language-dir.service';
import { TranslationService } from 'src/app/core/services/translation.service';
import { EntityRole, EntityRoleBackend } from '../../../models/roles.model';
import { IEntityDetails } from 'src/app/core/models/account-status.model';
import { EntitiesService } from 'src/app/modules/entity-administration/entities/services/entities.service';

type RoleActionContext = 'list' | 'delete';

@Component({
    selector: 'app-roles-list',
    templateUrl: './roles-list.component.html',
    styleUrls: ['./roles-list.component.scss']
})
export class RolesListComponent implements OnInit, OnDestroy, OnChanges {
    @Input() entityId?: number; // Optional: if provided, use this instead of localStorage

    roles: EntityRole[] = [];
    isLoading$: Observable<boolean>;
    tableLoadingSpinner = false;
    private subscriptions: Subscription[] = [];

    /** When loading and roles is empty, return placeholder rows so the table can show skeleton cells. */
    get tableValue(): EntityRole[] {
        if (this.tableLoadingSpinner && this.roles.length === 0) {
            return Array(10).fill(null).map(() => ({} as EntityRole));
        }
        return this.roles;
    }
    menuItems: MenuItem[] = [];
    currentRole?: EntityRole;
    deleteRoleDialog: boolean = false;
    currentRoleForDelete?: EntityRole;
    private _entityId: number = 0;
    private rawRoles: EntityRoleBackend[] = [];
    private rawEntityForDialog: any = null;

    // Getter to access entityId from template
    get entityIdForTemplate(): number {
        return this._entityId;
    }

    get entityIdForDialog(): number {
        return this._entityId;
    }

    entityNameForDialog: string = '';
    roleFormDialogVisible: boolean = false;
    roleFormMode: 'create' | 'edit' = 'edit';

    // Pagination
    first: number = 0;
    rows: number = 10;
    totalRecords: number = 0;

    constructor(
        private rolesService: RolesService,
        private router: Router,
        private messageService: MessageService,
        private localStorageService: LocalStorageService,
        private languageDirService: LanguageDirService,
        private entitiesService: EntitiesService,
        private translate: TranslationService
    ) {
        this.isLoading$ = this.rolesService.isLoadingSubject.asObservable();
    }

    ngOnInit(): void {
        // Use input entityId if provided, otherwise fall back to localStorage
        if (this.entityId && this.entityId > 0) {
            this._entityId = this.entityId;
        } else {
            this._entityId = Number(this.localStorageService.getEntityId()) || 0;
        }
        this.configureMenuItems();
        this.subscriptions.push(
            this.languageDirService.userLanguageCode$.subscribe(() => {
                this.mapRawRoles();
                this.mapEntityNameForDialog();
            })
        );
        this.loadEntityNameForDialog();
        this.loadRoles();
    }


    ngOnChanges(changes: SimpleChanges): void {
        // If entityId input changes, update and reload
        if (changes['entityId'] && !changes['entityId'].firstChange) {
            if (this.entityId && this.entityId > 0) {
                this._entityId = this.entityId;
                this.first = 0;
                this.loadEntityNameForDialog();
                this.loadRoles();
            }
        }
    }

    ngOnDestroy(): void {
        this.subscriptions.forEach((sub) => sub.unsubscribe());
    }

    loadRoles(): void {

        if (!this._entityId || this._entityId === 0) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Warning',
                detail: 'Please select an entity first.'
            });
            return;
        }

        this.tableLoadingSpinner = true;

        // API uses negative page numbers: -1 = page 1, -2 = page 2, etc.
        const currentPage = Math.floor(this.first / this.rows) + 1;
        const lastRoleId = -currentPage;

        const sub = this.rolesService.listEntityRoles(this._entityId, lastRoleId, this.rows).subscribe({
            next: (response: any) => {
                console.log('response listEntityRoles111', response);
                if (!response?.success) {
                    this.handleBusinessError('list', response);
                    return;
                }
                console.log('response listEntityRoles', response);
                this.totalRecords = Number(response.message?.Total_Count || 0);

                let rolesData: any = {};
                const messageData = response.message?.Entity_Roles || {};
                Object.keys(messageData).forEach((key) => {
                    const item = messageData[key];
                    if (typeof item === 'object' && item !== null && item.Entity_Role_ID !== undefined) {
                        rolesData[key] = item;
                    }
                });
                console.log('rolesData', rolesData);

                this.rawRoles = Object.values(rolesData) as EntityRoleBackend[];
                this.mapRawRoles();
            },
            complete: () => this.resetLoadingFlags()
        });

        this.subscriptions.push(sub);
    }

    onPageChange(event: any): void {
        this.first = event.first;
        this.rows = event.rows;
        this.loadRoles();
    }

    openEditRoleDialog(role: EntityRole): void {
        this.roleFormMode = 'edit';
        this.currentRoleForEdit = role;
        this.roleFormDialogVisible = true;
    }

    openCreateRoleDialog(): void {
        if (!this._entityId || this._entityId <= 0) {
            this.messageService.add({
                severity: 'warn',
                summary: this.translate.getInstant('entityRoles.messages.warningTitle'),
                detail: this.translate.getInstant('entityRoles.list.noEntityForNewRole')
            });
            return;
        }
        this.roleFormMode = 'create';
        this.currentRoleForEdit = undefined;
        this.loadEntityNameForDialog();
        this.roleFormDialogVisible = true;
    }

    private loadEntityNameForDialog(): void {
        if (!this._entityId || this._entityId <= 0) {
            this.entityNameForDialog = '';
            return;
        }
        const stored = this.localStorageService.getEntityDetails() as IEntityDetails | null;
        if (stored && String(stored.Entity_ID) === String(this._entityId)) {
            this.rawEntityForDialog = stored;
            this.mapEntityNameForDialog();
            return;
        }
        const sub = this.entitiesService.getEntityDetails(String(this._entityId)).subscribe({
            next: (response: any) => {
                if (!response?.success || !response?.message) {
                    this.entityNameForDialog = '';
                    return;
                }
                const m = response.message;
                this.rawEntityForDialog = m;
                this.mapEntityNameForDialog();
            },
            error: () => {
                this.entityNameForDialog = '';
            }
        });
        this.subscriptions.push(sub);
    }

    viewDetails(role: EntityRole): void {
        if (role.id) {
            // Include entityId as query param if we have it
            const queryParams: any = {};
            if (this._entityId && this._entityId > 0) {
                queryParams.entityId = this._entityId;
            }
            this.router.navigate(['/entity-administration/roles', role.id], { queryParams });
        }
    }

    openMenu(menuRef: any, role: EntityRole, event: Event): void {
        this.currentRole = role;
        menuRef.toggle(event);
    }

    confirmDelete(role: EntityRole): void {
        this.currentRoleForDelete = role;
        this.deleteRoleDialog = true;
    }

    onCancelDeleteDialog(): void {
        this.deleteRoleDialog = false;
        this.currentRoleForDelete = undefined;
    }

    deleteRole(): void {
        if (!this.currentRoleForDelete) {
            return;
        }

        const role = this.currentRoleForDelete;

        const sub = this.rolesService.removeEntityRole(Number(role.id)).subscribe({
            next: (response: any) => {
                if (!response?.success) {
                    this.handleBusinessError('delete', response);
                    this.deleteRoleDialog = false;
                    return;
                }

                this.messageService.add({
                    severity: 'success',
                    summary: 'Deleted',
                    detail: `Role "${role.title}" deleted successfully.`,
                    life: 3000
                });
                this.deleteRoleDialog = false;
                this.loadRoles();
            },
            complete: () => {
                this.currentRoleForDelete = undefined;
            }
        });

        this.subscriptions.push(sub);
    }

    currentRoleForEdit?: EntityRole;

    handleRoleUpdated(): void {
        // Reload roles list after role is updated
        this.loadRoles();
    }

    private configureMenuItems(): void {
        // Note: Delete permission check removed as 'Delete_Entity_Role' is not in the permission matrix
        // Backend API will enforce authorization

        this.menuItems = [
            {
                label: this.translate.getInstant('shared.actions.viewDetails'),
                icon: 'pi pi-eye',
                command: () => this.currentRole && this.viewDetails(this.currentRole)
            },
            {
                label: this.translate.getInstant('shared.actions.edit'),
                icon: 'pi pi-pencil',
                command: () => this.currentRole && this.openEditRoleDialog(this.currentRole)
            },
            {
                label: this.translate.getInstant('shared.actions.delete'),
                icon: 'pi pi-trash',
                command: () => this.currentRole && this.confirmDelete(this.currentRole)
            }
        ];
    }

    private handleBusinessError(context: RoleActionContext, response: any): void | null {
        const code = String(response?.message || '');
        let detail = '';

        switch (context) {
            case 'list':
                detail = this.getListErrorMessage(code) || '';
                break;
            case 'delete':
                detail = this.getDeleteErrorMessage(code) || '';
                break;
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

        if (context === 'list') {
            this.resetLoadingFlags();
        }
        return null;
    }

    private getListErrorMessage(code: string): string | null {
        switch (code) {
            case 'ERP11300':
                return 'Invalid Entity ID';
            case 'ERP11312':
                return 'Invalid value for the Filter_Count parameter (should be a minimum of 5 records, and a maximum of 100 records)';
            case 'ERP11310':
                return 'Invalid Entity Role ID';
            case 'ERP11305':
                return 'Access Denied to Entity Roles';
            default:
                return null;
        }
    }

    private getDeleteErrorMessage(code: string): string | null {
        switch (code) {
            case 'ERP11310':
                return 'Invalid Entity Role ID';
            case 'ERP11311':
                return 'Cannot remove Entity Role if already assigned to accounts. Role assignments should be removed first.';
            case 'ERP11305':
                return 'Access Denied to Entity Roles';
            default:
                return null;
        }
    }

    private resetLoadingFlags(): void {
        this.tableLoadingSpinner = false;
    }

    private mapRawRoles(): void {
        const isRegional = this.localStorageService.getPreferredLanguageCode() === 'ar';
        this.roles = this.rawRoles.map((item) => ({
            id: String(item?.Entity_Role_ID || ''),
            entityId: String(item?.Entity_ID || ''),
            title: isRegional ? (item?.Title_Regional || item?.Title || '') : (item?.Title || ''),
            description: isRegional ? (item?.Description_Regional || item?.Description || '') : (item?.Description || ''),
            titleRegional: item?.Title_Regional || '',
            descriptionRegional: item?.Description_Regional || '',
            functions: item?.Functions || [],
            modules: item?.Modules || []
        }));
    }

    private mapEntityNameForDialog(): void {
        if (!this.rawEntityForDialog) {
            return;
        }

        const isRegional = this.localStorageService.getPreferredLanguageCode() === 'ar';
        this.entityNameForDialog = isRegional
            ? (this.rawEntityForDialog.Name_Regional || this.rawEntityForDialog.Name || '')
            : (this.rawEntityForDialog.Name || '');
    }
}
