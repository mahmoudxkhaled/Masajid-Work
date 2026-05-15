import { Component, OnInit } from '@angular/core';
import { PermissionService } from 'src/app/core/services/permission.service';
import { Roles } from 'src/app/core/models/system-roles';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';
import { EntitiesService } from 'src/app/modules/entity-administration/entities/services/entities.service';
import { Entity, EntityBackend } from 'src/app/modules/entity-administration/entities/models/entities.model';
import { SettingsApiService } from '../../../services/settings-api.service';

@Component({
    selector: 'app-entity-settings-tab',
    templateUrl: './entity-settings-tab.component.html',
    styleUrls: ['./entity-settings-tab.component.scss'],
})
export class EntitySettingsTabComponent implements OnInit {
    canManageDefault = false;
    defaultEntityData: Record<string, string> | null = null;
    entityCustomData: Record<string, string> | null = null;
    entitySettingsReady = false;
    loading = false;
    entityDisplayName = '';
    selectedEntityId = 0;
    private runtimeEntityId = 0;
    selectedEntityForSettings?: Entity;

    entityDialogVisible = false;
    loadingEntitiesTable = false;
    entitiesForSelection: Entity[] = [];
    pendingSelectedEntity?: Entity;
    entityTableFirst = 0;
    entityTableRows = 10;
    entityTableTotalRecords = 0;
    entityTableTextFilter = '';

    get entityTableValue(): Entity[] {
        if (this.loadingEntitiesTable && this.entitiesForSelection.length === 0) {
            return Array(this.entityTableRows).fill(null).map(() => ({} as Entity));
        }
        return this.entitiesForSelection;
    }

    constructor(
        private permissionService: PermissionService,
        private settingsApiService: SettingsApiService,
        private localStorageService: LocalStorageService,
        private entitiesService: EntitiesService
    ) {}

    ngOnInit(): void {
        this.canManageDefault = this.permissionService.hasAnyRole([
            Roles.Developer,
            Roles.SystemAdministrator,
        ]);
        this.initSelectedEntityFromContext();
        this.loadEntityTab();
    }

    get syncSelectedToRuntimeEngine(): boolean {
        return this.selectedEntityId > 0 && this.selectedEntityId === this.runtimeEntityId;
    }

    reloadEntityTab(): void {
        this.loadEntityTab();
    }

    private loadEntityTab(): void {
        const entityId = Number(this.selectedEntityId || 0);
        if (!entityId) {
            this.defaultEntityData = {};
            this.entityCustomData = {};
            this.entitySettingsReady = true;
            return;
        }

        this.loading = true;
        this.settingsApiService.getEntitySettings(entityId).subscribe({
            next: (response: any) => {
                this.loading = false;
                if (response?.success && response?.message) {
                    const msg = response.message;
                    this.defaultEntityData = { ...(msg.Default_Entity_Settings ?? msg.default_Entity_Settings ?? {}) };
                    this.entityCustomData = { ...(msg.Entity_Settings ?? msg.entity_Settings ?? {}) };
                } else {
                    this.defaultEntityData = {};
                    this.entityCustomData = {};
                }
                this.entitySettingsReady = true;
            },
            error: () => {
                this.loading = false;
                this.defaultEntityData = {};
                this.entityCustomData = {};
                this.entitySettingsReady = true;
            },
        });
    }

    openEntityDialog(): void {
        this.entityDialogVisible = true;
        this.entityTableTextFilter = '';
        this.entityTableFirst = 0;
        this.pendingSelectedEntity = this.selectedEntityForSettings;
        this.loadEntitiesForSelection(true);
    }

    closeEntityDialog(): void {
        this.entityDialogVisible = false;
    }

    confirmEntitySelection(): void {
        if (this.pendingSelectedEntity) {
            this.applySelectedEntity(this.pendingSelectedEntity);
        }
        this.closeEntityDialog();
    }

    onEntityTablePageChange(event: any): void {
        this.entityTableFirst = event?.first ?? 0;
        this.entityTableRows = event?.rows ?? this.entityTableRows;
        this.loadEntitiesForSelection(true);
    }

    onEntityTableSearchInput(event: Event): void {
        const target = event.target as HTMLInputElement;
        this.entityTableTextFilter = target?.value || '';
        this.entityTableFirst = 0;
        this.loadEntitiesForSelection(true);
    }

    selectPendingEntity(entity: Entity): void {
        this.pendingSelectedEntity = entity;
    }

    isPendingEntitySelected(entity: Entity): boolean {
        return this.pendingSelectedEntity?.id === entity.id;
    }

    getEntitySelectorDisplayText(): string {
        if (!this.selectedEntityForSettings) {
            return '';
        }
        const name = this.selectedEntityForSettings.name || '';
        const code = this.selectedEntityForSettings.code || '';
        return code ? `${name} (${code})` : name;
    }

    private initSelectedEntityFromContext(): void {
        const d = this.localStorageService.getEntityDetails();
        if (!d) {
            this.selectedEntityId = 0;
            this.runtimeEntityId = 0;
            this.selectedEntityForSettings = undefined;
            this.entityDisplayName = '';
            return;
        }

        const lang = this.localStorageService.getPreferredLanguageCode();
        const name =
            lang === 'ar'
                ? ((d.Name_Regional || '').trim() || (d.Name || '').trim() || '')
                : ((d.Name || '').trim() || '');

        const id = Number(d.Entity_ID || 0);
        this.runtimeEntityId = id;
        this.selectedEntityId = id;
        this.selectedEntityForSettings = {
            id: String(d.Entity_ID || ''),
            code: d.Code || '',
            name,
            description: '',
            parentEntityId: String(d.Parent_Entity_ID || ''),
            active: Boolean(d.Is_Active),
            isPersonal: Boolean(d.Is_Personal),
        };
        this.entityDisplayName = name;
    }

    private loadEntitiesForSelection(forceReload = false): void {
        if (this.entitiesService.isLoadingSubject.value && !forceReload) {
            return;
        }

        this.loadingEntitiesTable = true;
        const currentPage = Math.floor(this.entityTableFirst / this.entityTableRows) + 1;
        const lastEntityId = -currentPage;

        this.entitiesService.listEntities(lastEntityId, this.entityTableRows, this.entityTableTextFilter, null).subscribe({
            next: (response: any) => {
                if (!response?.success) {
                    this.entitiesForSelection = [];
                    this.entityTableTotalRecords = 0;
                    this.loadingEntitiesTable = false;
                    return;
                }

                this.entityTableTotalRecords = Number(response.message.Total_Count || 0);
                const entitiesData = response.message.Entities_List || response.message.Entities || {};
                const rawEntities = Object.values(entitiesData) as EntityBackend[];
                const isRegional = this.localStorageService.getPreferredLanguageCode() === 'ar';
                this.entitiesForSelection = rawEntities.map((item) => ({
                    id: String(item?.Entity_ID || ''),
                    code: item?.Code || '',
                    name: isRegional ? (item?.Name_Regional || item?.Name || '') : (item?.Name || ''),
                    description: isRegional ? (item?.Description_Regional || item?.Description || '') : (item?.Description || ''),
                    parentEntityId: item?.Parent_Entity_ID ? String(item?.Parent_Entity_ID) : '',
                    active: Boolean(item?.Is_Active),
                    isPersonal: Boolean(item?.Is_Personal),
                }));
                this.loadingEntitiesTable = false;
            },
            error: () => {
                this.entitiesForSelection = [];
                this.entityTableTotalRecords = 0;
                this.loadingEntitiesTable = false;
            },
        });
    }

    private applySelectedEntity(entity: Entity): void {
        this.selectedEntityForSettings = entity;
        this.selectedEntityId = Number(entity.id || 0);
        this.entityDisplayName = entity.name || '';
        this.defaultEntityData = null;
        this.entityCustomData = null;
        this.entitySettingsReady = false;
        this.loadEntityTab();
    }
}
