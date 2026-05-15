import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormControl } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MenuItem, MessageService } from 'primeng/api';
import { Observable, Subscription } from 'rxjs';
import { EntitiesService } from 'src/app/modules/entity-administration/entities/services/entities.service';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';
import { TranslationService } from 'src/app/core/services/translation.service';
import { LanguageDirService } from 'src/app/core/services/language-dir.service';
import { Entity, EntityBackend } from 'src/app/modules/entity-administration/entities/models/entities.model';
import { Roles } from 'src/app/core/models/system-roles';
import { PermissionService } from 'src/app/core/services/permission.service';

type EntityActionContext = 'list' | 'activate' | 'deactivate' | 'delete';

@Component({
    selector: 'app-shared-entities-list',
    templateUrl: './shared-entities-list.component.html',
    styleUrls: ['./shared-entities-list.component.scss']
})
export class SharedEntitiesListComponent implements OnInit, OnDestroy {
    entities: Entity[] = [];
    isLoading$: Observable<boolean>;
    tableLoadingSpinner = false;
    private subscriptions: Subscription[] = [];
    private rawEntities: EntityBackend[] = [];
    entityLogoUrls: Record<string, string> = {};
    entityLogoLoading: Record<string, boolean> = {};

    /** When loading and entities is empty, return placeholder rows so the table can show skeleton cells. */
    get tableValue(): Entity[] {
        if (this.tableLoadingSpinner && this.entities.length === 0) {
            return Array(10).fill(null).map(() => ({} as Entity));
        }
        return this.entities;
    }
    activationControls: Record<string, FormControl<boolean>> = {};
    menuItems: MenuItem[] = [];
    currentEntity?: Entity;
    activationEntityDialog: boolean = false;
    currentEntityForActivation?: Entity;
    deleteEntityDialog: boolean = false;
    currentEntityForDelete?: Entity;
    first: number = 0;
    rows: number = 10;
    totalRecords: number = 0;
    textFilter: string = '';
    requestedSystemRole: number = 0;
    private lastCompletedRequestSignature: string = '';
    private activeRequestSignature: string | null = null;

    constructor(
        private entitiesService: EntitiesService,
        private router: Router,
        private messageService: MessageService,
        private localStorageService: LocalStorageService,
        private permissionService: PermissionService,
        private translate: TranslationService,
        private languageDirService: LanguageDirService,
        private route: ActivatedRoute
    ) {
        this.isLoading$ = this.entitiesService.isLoadingSubject.asObservable();
    }

    ngOnInit(): void {
        this.configureMenuItems();
        this.requestedSystemRole =
            this.route.snapshot.data['requestedSystemRole'] ?? this.permissionService.getCurrentRoleId();
        this.subscriptions.push(
            this.languageDirService.userLanguageCode$.subscribe(() => {
                this.mapRawEntities();
                this.configureMenuItems();
            })
        );
    }

    ngOnDestroy(): void {
        this.subscriptions.forEach((sub) => sub.unsubscribe());
    }

    loadEntities(forceReload: boolean = false): void {
        const requestSignature = this.buildListRequestSignature();

        if (!forceReload && this.activeRequestSignature === requestSignature) {
            return;
        }

        if (!forceReload && this.lastCompletedRequestSignature === requestSignature) {
            this.mapRawEntities();
            return;
        }

        this.activeRequestSignature = requestSignature;
        this.tableLoadingSpinner = true;

        // API uses negative page numbers: -1 = page 1, -2 = page 2, etc.
        const currentPage = Math.floor(this.first / this.rows) + 1;
        const lastEntityId = -currentPage;

        const sub = this.entitiesService.listEntities(
            lastEntityId,
            this.rows,
            this.textFilter,
            this.requestedSystemRole
        ).subscribe({
            next: (response: any) => {
                if (!response?.success) {
                    this.handleBusinessError('list', response);
                    return;
                }
                this.lastCompletedRequestSignature = requestSignature;
                this.totalRecords = Number(response.message.Total_Count);

                let entitiesData: any = {};
                const messageData = response.message.Entities_List || response.message.Entities;
                entitiesData = {};
                Object.keys(messageData).forEach((key) => {
                    const item = messageData[key];
                    if (typeof item === 'object' && item !== null && item.Entity_ID !== undefined) {
                        entitiesData[key] = item;
                    }
                });
                this.rawEntities = Object.values(entitiesData) as EntityBackend[];
                this.mapRawEntities();
                this.buildActivationControls();
                this.loadLogosForCurrentPage();
            },
            error: () => {
                this.resetLoadingFlags(requestSignature);
            },
            complete: () => this.resetLoadingFlags(requestSignature)
        });
        this.subscriptions.push(sub);
    }

    onPageChange(event: any): void {
        const nextFirst = event?.first ?? 0;
        const nextRows = event?.rows ?? this.rows;
        this.first = nextFirst;
        this.rows = nextRows;
        this.loadEntities();
    }
    isFirstPage(): boolean {
        return this.first === 0;
    }

    isLastPage(): boolean {
        return this.totalRecords > 0 ? this.first + this.rows >= this.totalRecords : true;
    }

    edit(entity: Entity): void {
        if (entity.id) {
            const baseRoute = this.route.parent ?? this.route;
            this.router.navigate([entity.id, 'edit'], { relativeTo: baseRoute });
        }
    }

    viewDetails(entity: Entity): void {
        if (entity.id) {
            const baseRoute = this.route.parent ?? this.route;
            this.router.navigate([entity.id], { relativeTo: baseRoute });
        }
    }

    getEntityLogoUrl(entity: Entity): string | null {
        if (!entity?.id) return null;
        return this.entityLogoUrls[entity.id] || null;
    }

    isEntityLogoLoading(entity: Entity): boolean {
        if (!entity?.id) return false;
        return !!this.entityLogoLoading[entity.id];
    }

    private loadLogosForCurrentPage(): void {
        // Load logos only for visible page rows (simple cache by entity id).
        this.entities.forEach((entity) => {
            if (!entity?.id) return;
            if (this.entityLogoUrls[entity.id]) return;
            if (this.entityLogoLoading[entity.id]) return;

            this.entityLogoLoading[entity.id] = true;
            const sub = this.entitiesService.getEntityLogo(entity.id, false).subscribe({
                next: (logoRes: any) => {
                    console.log('response loadLogosForCurrentPage', entity.id, logoRes);
                    if (logoRes?.success && logoRes?.message?.Image) {
                        const fmt = logoRes.message.Image_Format || 'png';
                        this.entityLogoUrls[entity.id] = `data:image/${String(fmt).toLowerCase()};base64,${logoRes.message.Image}`;
                    }
                },
                complete: () => {
                    this.entityLogoLoading[entity.id] = false;
                }
            });
            this.subscriptions.push(sub);
        });
    }
    openMenu(menuRef: any, entity: Entity, event: Event): void {
        this.currentEntity = entity;
        menuRef.toggle(event);
    }

    onStatusToggle(entity: Entity): void {
        this.currentEntityForActivation = entity;
        this.activationEntityDialog = true;
    }

    onCancelActivationDialog(): void {
        this.activationEntityDialog = false;
        if (this.currentEntityForActivation) {
            const control = this.activationControls[this.currentEntityForActivation.id];
            if (control) {
                control.setValue(this.currentEntityForActivation.active, { emitEvent: false });
            }
        }
        this.currentEntityForActivation = undefined;
    }

    activation(value: boolean): void {
        if (!this.currentEntityForActivation) {
            return;
        }

        const entity = this.currentEntityForActivation;
        const control = this.activationControls[entity.id];
        if (!control) {
            return;
        }

        control.disable();
        const context: EntityActionContext = value ? 'activate' : 'deactivate';
        const toggle$ = value
            ? this.entitiesService.activateEntity(entity.id)
            : this.entitiesService.deactivateEntity(entity.id);

        const sub = toggle$.subscribe({
            next: (response: any) => {
                if (!response?.success) {
                    this.handleBusinessError(context, response);
                    control.setValue(!value, { emitEvent: false });
                    this.activationEntityDialog = false;
                    return;
                }

                this.messageService.add({
                    severity: 'success',
                    summary: 'Success',
                    detail: value ? 'Entity activated successfully.' : 'Entity deactivated successfully.',
                    life: 3000
                });
                entity.active = value;
                this.activationEntityDialog = false;
                this.loadEntities(true);
            },
            complete: () => {
                control.enable();
                this.currentEntityForActivation = undefined;
            }
        });

        this.subscriptions.push(sub);
    }

    confirmDelete(entity: Entity): void {
        this.currentEntityForDelete = entity;
        this.deleteEntityDialog = true;
    }

    onCancelDeleteDialog(): void {
        this.deleteEntityDialog = false;
        this.currentEntityForDelete = undefined;
    }

    deleteEntity(): void {
        if (!this.currentEntityForDelete) {
            return;
        }

        const entity = this.currentEntityForDelete;

        const sub = this.entitiesService.deleteEntity(entity.id).subscribe({
            next: (response: any) => {
                if (!response?.success) {
                    this.handleBusinessError('delete', response);
                    this.deleteEntityDialog = false;
                    return;
                }

                this.messageService.add({
                    severity: 'success',
                    summary: 'Deleted',
                    detail: `${entity.name} deleted successfully.`,
                    life: 3000
                });
                this.deleteEntityDialog = false;
                this.loadEntities(true);
            },
            complete: () => {
                this.currentEntityForDelete = undefined;
            }
        });

        this.subscriptions.push(sub);
    }

    navigateToNew(): void {
        const baseRoute = this.route.parent ?? this.route;
        this.router.navigate(['new'], { relativeTo: baseRoute });
    }

    onSearchInput(event: Event): void {
        const target = event.target as HTMLInputElement;
        const searchValue = target?.value || '';
        this.textFilter = searchValue;
        this.first = 0; // Reset to first page when filter changes
        this.loadEntities(true);
    }

    getTypeLabel(entity: Entity): string {
        return entity.isPersonal ? 'Personal' : 'Organization';
    }

    getTypeSeverity(entity: Entity): 'success' | 'warning' | 'info' | 'danger' | 'secondary' {
        return entity.isPersonal ? 'warning' : 'info';
    }

    getStatusSeverity(status: boolean): string {
        return status ? 'success' : 'danger';
    }

    getStatusLabel(status: boolean): string {
        return status ? 'Active' : 'Inactive';
    }

    getParentLabel(entity: Entity): string {
        return entity.parentEntityId ? `Sub from #${entity.parentEntityId}` : 'Root Entity';
    }

    private buildActivationControls(): void {
        this.activationControls = {};
        this.entities.forEach((entity) => {
            this.activationControls[entity.id] = new FormControl<boolean>(entity.active, { nonNullable: true });
        });
    }

    private mapRawEntities(): void {
        const isRegional = this.localStorageService.getPreferredLanguageCode() === 'ar';
        this.entities = this.rawEntities.map((item: EntityBackend) => ({
            id: String(item?.Entity_ID || ''),
            code: item?.Code || '',
            name: isRegional ? (item?.Name_Regional || item?.Name || '') : (item?.Name || ''),
            description: isRegional ? (item?.Description_Regional || item?.Description || '') : (item?.Description || ''),
            parentEntityId: item?.Parent_Entity_ID ? String(item?.Parent_Entity_ID) : '',
            active: Boolean(item?.Is_Active),
            isPersonal: Boolean(item?.Is_Personal)
        }));
    }

    private configureMenuItems(): void {
        const canDeleteEntity = this.permissionService.can('Delete_Entity');

        this.menuItems = [
            {
                label: this.translate.getInstant('shared.actions.viewDetails'),
                icon: 'pi pi-eye',
                command: () => this.currentEntity && this.viewDetails(this.currentEntity)
            },
            ...(canDeleteEntity ? [{
                label: this.translate.getInstant('shared.actions.delete'),
                icon: 'pi pi-trash',
                command: () => this.currentEntity && this.confirmDelete(this.currentEntity)
            }] : [])
        ];
    }

    private handleBusinessError(context: EntityActionContext, response: any): void | null {
        const code = String(response?.message || '');
        let detail = '';

        switch (context) {
            case 'list':
                detail = this.getListErrorMessage(code) || '';
                break;
            case 'activate':
                detail = this.getActivateErrorMessage(code) || '';
                break;
            case 'deactivate':
                detail = this.getDeactivateErrorMessage(code) || '';
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
            case 'ERP11255':
                return 'Invalid value for the Filter_Count parameter, should be a minimum of 5 records, and a maximum of 100 records';
            default:
                return null;
        }
    }

    private getActivateErrorMessage(code: string): string | null {
        switch (code) {
            case 'ERP11260':
                return 'Invalid Entity ID';
            case 'ERP11261':
                return 'An entity administrator cannot activate/deactivate his parent entity';
            case 'ERP11262':
                return 'The entity is already active';
            default:
                return null;
        }
    }

    private getDeactivateErrorMessage(code: string): string | null {
        switch (code) {
            case 'ERP11260':
                return 'Invalid Entity ID';
            case 'ERP11261':
                return 'An entity administrator cannot activate/deactivate his parent entity';
            case 'ERP11263':
                return 'The entity is already deactivated';
            default:
                return null;
        }
    }

    private getDeleteErrorMessage(code: string): string | null {
        switch (code) {
            case 'ERP11260':
                return 'Invalid Entity ID';
            case 'ERP11270':
                return 'The entity contains accounts and other data. It should be either deactivated, or all linked records need to be deleted first';
            default:
                return null;
        }
    }

    private buildListRequestSignature(): string {
        const currentPage = Math.floor(this.first / this.rows) + 1;
        return JSON.stringify({
            page: currentPage,
            rows: this.rows,
            filter: (this.textFilter || '').trim(),
            requestedSystemRole: this.requestedSystemRole
        });
    }

    private resetLoadingFlags(requestSignature?: string): void {
        if (!requestSignature || this.activeRequestSignature === requestSignature) {
            this.activeRequestSignature = null;
        }
        this.tableLoadingSpinner = false;
    }
}

