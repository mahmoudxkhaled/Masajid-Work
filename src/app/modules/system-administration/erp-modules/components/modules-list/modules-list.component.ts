import { Component, OnInit, OnDestroy, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Router } from '@angular/router';
import { MenuItem, MessageService } from 'primeng/api';
import { Observable, Subscription, forkJoin } from 'rxjs';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';
import { LanguageDirService } from 'src/app/core/services/language-dir.service';
import { TranslationService } from 'src/app/core/services/translation.service';
import { SettingsConfigurationsService } from 'src/app/modules/system-administration/settings-configurations.service';
import { Function, FunctionBackend, Module, ModuleBackend } from '../../../erp-functions/models/settings-configurations.model';


type ModuleActionContext = 'list' | 'activate' | 'deactivate' | 'reorder';

@Component({
    selector: 'app-modules-list',
    templateUrl: './modules-list.component.html',
    styleUrls: ['./modules-list.component.scss']
})
export class ModulesListComponent implements OnInit, OnDestroy {
    @ViewChild('modulesTableContainer') modulesTableContainer?: ElementRef;

    modules: Module[] = [];
    functions: Function[] = []; // For mapping function IDs to names
    isLoading$: Observable<boolean>;
    tableLoadingSpinner = false;
    private subscriptions: Subscription[] = [];
    private rawFunctions: FunctionBackend[] = [];
    private rawModules: ModuleBackend[] = [];
    menuItems: MenuItem[] = [];
    currentModule?: Module;
    activateModuleDialog: boolean = false;
    currentModuleForActivation?: Module;
    logoDialogVisible: boolean = false;
    currentModuleForLogo?: Module;
    detailsDialogVisible: boolean = false;
    currentModuleForDetails?: Module;
    editDialogVisible: boolean = false;
    currentModuleForEdit: Module | null = null;
    activationControls: Record<number, FormControl<boolean>> = {};
    reorderInProgressIds = new Set<number>();
    logoCache: Record<number, string> = {};

    // Pagination (handled by PrimeNG automatically)
    first: number = 0;
    rows: number = 10;

    // Search functionality
    searchText: string = '';
    filteredModules: Module[] = [];

    /** When loading and filteredModules is empty, return placeholder rows so the table can show skeleton cells. */
    get tableValue(): Module[] {
        if (this.tableLoadingSpinner && this.filteredModules.length === 0) {
            return Array(10).fill(null).map(() => ({} as Module));
        }
        return this.filteredModules;
    }

    constructor(
        private settingsConfigurationsService: SettingsConfigurationsService,
        private router: Router,
        private messageService: MessageService,
        private localStorageService: LocalStorageService,
        private languageDirService: LanguageDirService,
        private translate: TranslationService,
        private cdr: ChangeDetectorRef
    ) {
        this.isLoading$ = this.settingsConfigurationsService.isLoadingSubject.asObservable();
    }

    ngOnInit(): void {
        this.configureMenuItems();
        this.subscriptions.push(
            this.languageDirService.userLanguageCode$.subscribe(() => {
                this.mapRawFunctions();
                this.mapRawModules();
                this.applySearchFilter();
            })
        );
        // Show skeleton immediately while we load (functions then modules)
        this.tableLoadingSpinner = true;
        this.loadFunctions();
    }

    ngOnDestroy(): void {
        this.subscriptions.forEach((sub) => sub.unsubscribe());
    }

    loadFunctions(): void {
        const sub = this.settingsConfigurationsService.getFunctionsList().subscribe({
            next: (response: any) => {
                if (response?.success) {
                    this.rawFunctions = this.getRawFunctions(response);
                    this.mapRawFunctions();
                }
            },
            complete: () => {
                // Load modules after functions are loaded
                this.loadModules();
            }
        });
        this.subscriptions.push(sub);
    }

    loadModules(forceReload: boolean = false, silent: boolean = false): void {
        if (!silent) {
            this.tableLoadingSpinner = true;
        }

        const sub = this.settingsConfigurationsService.getModulesList(silent ? { silent: true } : undefined).subscribe({
            next: (response: any) => {
                if (!response?.success) {
                    this.handleBusinessError('list', response);
                    return;
                }

                this.rawModules = this.getRawModules(response);
                this.mapRawModules();
                this.applySearchFilter();
                this.buildActivationControls();
                this.loadLogosForList();
            },
            complete: () => this.resetLoadingFlags()
        });

        this.subscriptions.push(sub);
    }

    getLogoUrl(moduleItem: Module): string | null {
        return this.logoCache[moduleItem.id] ?? null;
    }

    private loadLogosForList(): void {
        this.filteredModules.forEach((mod) => {
            if (this.logoCache[mod.id] !== undefined) {
                return;
            }
            const sub = this.settingsConfigurationsService.getModuleLogo(mod.id, { silent: true }).subscribe({
                next: (response: any) => {
                    if (response?.success && response?.message?.Image?.trim()) {
                        const fmt = response.message.Image_Format || 'png';
                        this.logoCache[mod.id] = `data:image/${fmt.toLowerCase()};base64,${response.message.Image}`;
                    } else {
                        this.logoCache[mod.id] = '';
                    }
                    this.cdr.markForCheck();
                }
            });
            this.subscriptions.push(sub);
        });
    }

    private getRawFunctions(response: any): FunctionBackend[] {
        const functionsData = response?.message?.Functions_List || response?.message || {};
        return (Object.values(functionsData) as FunctionBackend[]).filter((item) => item?.Function_ID !== undefined);
    }

    private getRawModules(response: any): ModuleBackend[] {
        const modulesData = response?.message?.Modules_List || response?.message || {};
        return (Object.values(modulesData) as ModuleBackend[]).filter((item) => item?.Module_ID !== undefined);
    }

    private mapRawFunctions(): void {
        const isRegional = this.localStorageService.getPreferredLanguageCode() === 'ar';
        this.functions = this.rawFunctions.map((item) => ({
            id: item.Function_ID,
            code: item.Code || '',
            name: isRegional ? (item.Name_Regional || item.Name || '') : (item.Name || ''),
            nameRegional: item.Name_Regional || '',
            defaultOrder: item.Default_Order,
            url: item.URL,
            isActive: item.Is_Active ?? true
        }));
    }

    private mapRawModules(): void {
        const isRegional = this.localStorageService.getPreferredLanguageCode() === 'ar';
        this.modules = this.rawModules.map((item) => ({
            id: item.Module_ID,
            functionId: item.Function_ID,
            code: item.Code || '',
            name: isRegional ? (item.Name_Regional || item.Name || '') : (item.Name || ''),
            nameRegional: item.Name_Regional || '',
            defaultOrder: item.Default_Order,
            url: item.URL,
            isActive: item.Is_Active ?? true
        }));
    }

    buildActivationControls(): void {
        this.activationControls = {};
        this.modules.forEach((moduleItem) => {
            this.activationControls[moduleItem.id] = new FormControl<boolean>(
                moduleItem.isActive ?? true,
                { nonNullable: true }
            );
        });
    }

    onPageChange(_event: any): void {
        this.scrollToTableTop();
    }

    scrollToTableTop(): void {
        // Use setTimeout to ensure the DOM has updated before scrolling
        setTimeout(() => {
            if (this.modulesTableContainer) {
                this.modulesTableContainer.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }, 0);
    }

    edit(moduleItem: Module): void {
        if (moduleItem.id) {
            this.currentModuleForEdit = moduleItem;
            this.editDialogVisible = true;
        }
    }

    viewDetails(moduleItem: Module): void {
        if (moduleItem.id) {
            this.currentModuleForDetails = moduleItem;
            this.detailsDialogVisible = true;
        }
    }

    onDetailsClosed(): void {
        this.detailsDialogVisible = false;
        this.currentModuleForDetails = undefined;
    }

    onDetailsEditRequested(): void {
        if (this.currentModuleForDetails) {
            this.currentModuleForEdit = this.currentModuleForDetails;
            this.detailsDialogVisible = false;
            this.currentModuleForDetails = undefined;
            this.editDialogVisible = true;
        }
    }

    onFormSaved(): void {
        this.editDialogVisible = false;
        this.currentModuleForEdit = null;
        this.loadModules(true);
    }

    onFormCancelled(): void {
        this.editDialogVisible = false;
        this.currentModuleForEdit = null;
    }

    openMenu(menuRef: any, moduleItem: Module, event: Event): void {
        this.currentModule = moduleItem;
        menuRef.toggle(event);
    }

    onStatusToggle(moduleItem: Module): void {
        this.currentModuleForActivation = moduleItem;
        this.activateModuleDialog = true;
    }

    onCancelActivationDialog(): void {
        this.activateModuleDialog = false;
        if (this.currentModuleForActivation) {
            const control = this.activationControls[this.currentModuleForActivation.id];
            if (control) {
                control.setValue(this.currentModuleForActivation.isActive ?? true, { emitEvent: false });
            }
        }
        this.currentModuleForActivation = undefined;
    }

    activation(value: boolean): void {
        if (!this.currentModuleForActivation) {
            return;
        }

        const moduleItem = this.currentModuleForActivation;
        const control = this.activationControls[moduleItem.id];
        if (!control) {
            return;
        }

        control.disable();
        const action = value ? 'activate' : 'deactivate';
        const apiCall = value
            ? this.settingsConfigurationsService.activateModule(moduleItem.id)
            : this.settingsConfigurationsService.deactivateModule(moduleItem.id);

        const sub = apiCall.subscribe({
            next: (response: any) => {
                if (!response?.success) {
                    this.handleBusinessError(action, response);
                    control.setValue(!value, { emitEvent: false });
                    this.activateModuleDialog = false;
                    return;
                }

                this.messageService.add({
                    severity: 'success',
                    summary: 'Success',
                    detail: `Module "${moduleItem.name}" ${value ? 'activated' : 'deactivated'} successfully.`,
                    life: 3000
                });
                moduleItem.isActive = value;
                this.activateModuleDialog = false;
                this.loadModules(true, false);
            },
            complete: () => {
                control.enable();
                this.currentModuleForActivation = undefined;
            }
        });

        this.subscriptions.push(sub);
    }

    openLogoDialog(moduleItem: Module): void {
        this.currentModuleForLogo = moduleItem;
        this.logoDialogVisible = true;
    }

    onLogoDialogClose(): void {
        this.logoDialogVisible = false;
        this.currentModuleForLogo = undefined;
    }

    onLogoUpdated(): void {
        if (!this.currentModuleForLogo?.id) {
            return;
        }
        const id = this.currentModuleForLogo.id;
        const sub = this.settingsConfigurationsService.getModuleLogo(id, { silent: true }).subscribe({
            next: (response: any) => {
                if (response?.success && response?.message?.Image?.trim()) {
                    const fmt = response.message.Image_Format || 'png';
                    this.logoCache[id] = `data:image/${fmt.toLowerCase()};base64,${response.message.Image}`;
                } else {
                    delete this.logoCache[id];
                }
                this.cdr.markForCheck();
            }
        });
        this.subscriptions.push(sub);
    }

    navigateToNew(): void {
        this.currentModuleForEdit = null;
        this.editDialogVisible = true;
    }

    getFunctionName(functionId: number): string {
        const functionItem = this.functions.find(f => f.id === functionId);
        return functionItem ? functionItem.name : `Function #${functionId}`;
    }

    private configureMenuItems(): void {
        this.menuItems = [
            {
                label: this.translate.getInstant('shared.actions.viewDetails'),
                icon: 'pi pi-eye',
                command: () => this.currentModule && this.viewDetails(this.currentModule)
            },
            {
                label: this.translate.getInstant('shared.actions.edit'),
                icon: 'pi pi-pencil',
                command: () => this.currentModule && this.edit(this.currentModule)
            },
            {
                label: this.translate.getInstant('shared.actions.manageLogo'),
                icon: 'pi pi-image',
                command: () => this.currentModule && this.openLogoDialog(this.currentModule)
            },
        ];
    }

    private handleBusinessError(context: ModuleActionContext, response: any): void | null {
        const code = String(response?.message || '');
        let detail = '';

        switch (context) {
            case 'list':
                detail = this.getListErrorMessage(code) || '';
                break;
            case 'activate':
            case 'deactivate':
                detail = this.getActivationErrorMessage(code) || '';
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
        // Get_Modules_List (715) has no specific error codes
        return null;
    }

    private getActivationErrorMessage(code: string): string | null {
        switch (code) {
            case 'ERP11410':
                return 'Invalid Module ID';
            case 'ERP11411':
                return 'Module already Active';
            case 'ERP11412':
                return 'Module already Inactive';
            default:
                return null;
        }
    }

    private resetLoadingFlags(): void {
        this.tableLoadingSpinner = false;
    }

    onSearchInput(event: Event): void {
        const target = event.target as HTMLInputElement;
        this.searchText = target?.value || '';
        this.first = 0;
        this.applySearchFilter();
    }

    clearSearch(): void {
        this.searchText = '';
        this.first = 0;
        this.applySearchFilter();
    }

    private applySearchFilter(): void {
        let candidates: Module[];
        if (!this.searchText || this.searchText.trim() === '') {
            candidates = [...this.modules];
        } else {
            const searchTerm = this.searchText.toLowerCase().trim();
            candidates = this.modules.filter((moduleItem) => {
                const codeMatch = moduleItem.code?.toLowerCase().includes(searchTerm) || false;
                const nameMatch = moduleItem.name?.toLowerCase().includes(searchTerm) || false;
                const idMatch = String(moduleItem.id).includes(searchTerm) || false;
                const urlMatch = moduleItem.url?.toLowerCase().includes(searchTerm) || false;
                const functionNameMatch = this.getFunctionName(moduleItem.functionId).toLowerCase().includes(searchTerm) || false;
                return codeMatch || nameMatch || idMatch || urlMatch || functionNameMatch;
            });
        }
        this.filteredModules = [...candidates].sort((a, b) => {
            const funcCmp = (a.functionId ?? 0) - (b.functionId ?? 0);
            if (funcCmp !== 0) return funcCmp;
            return (a.defaultOrder ?? 9999) - (b.defaultOrder ?? 9999);
        });
        this.clampFirstToFilteredLength();
        this.loadLogosForList();
    }

    private clampFirstToFilteredLength(): void {
        const count = this.filteredModules.length;
        if (count === 0) {
            this.first = 0;
            return;
        }
        if (this.first >= count) {
            this.first = Math.floor((count - 1) / this.rows) * this.rows;
        }
    }

    isFirstRow(moduleItem: Module): boolean {
        return this.filteredModules.length > 0 && this.filteredModules[0].id === moduleItem.id;
    }

    isLastRow(moduleItem: Module): boolean {
        return this.filteredModules.length > 0 && this.filteredModules[this.filteredModules.length - 1].id === moduleItem.id;
    }

    isReorderInProgress(moduleItem: Module): boolean {
        return this.reorderInProgressIds.has(moduleItem.id);
    }

    moveUp(moduleItem: Module): void {
        const currentIndex = this.filteredModules.findIndex((m) => m.id === moduleItem.id);
        if (currentIndex <= 0) {
            return;
        }
        const other = this.filteredModules[currentIndex - 1];
        const orderA = moduleItem.defaultOrder ?? 0;
        const orderB = other.defaultOrder ?? 0;
        this.reorderTwoModules(moduleItem, other, orderB, orderA);
    }

    moveDown(moduleItem: Module): void {
        const currentIndex = this.filteredModules.findIndex((m) => m.id === moduleItem.id);
        if (currentIndex < 0 || currentIndex >= this.filteredModules.length - 1) {
            return;
        }
        const other = this.filteredModules[currentIndex + 1];
        const orderA = moduleItem.defaultOrder ?? 0;
        const orderB = other.defaultOrder ?? 0;
        this.reorderTwoModules(moduleItem, other, orderB, orderA);
    }

    private reorderTwoModules(moduleA: Module, moduleB: Module, newOrderA: number, newOrderB: number): void {
        this.reorderInProgressIds.add(moduleA.id);
        this.reorderInProgressIds.add(moduleB.id);

        const getDetailsA = this.settingsConfigurationsService.getModuleDetails(moduleA.id, { silent: true });
        const getDetailsB = this.settingsConfigurationsService.getModuleDetails(moduleB.id, { silent: true });

        const sub = forkJoin({ detailsA: getDetailsA, detailsB: getDetailsB }).subscribe({
            next: (result) => {
                const msgA = result.detailsA?.message;
                const msgB = result.detailsB?.message;
                if (!result.detailsA?.success || !msgA || !result.detailsB?.success || !msgB) {
                    this.reorderInProgressIds.delete(moduleA.id);
                    this.reorderInProgressIds.delete(moduleB.id);
                    this.messageService.add({
                        severity: 'error',
                        summary: this.translate.getInstant('common.error'),
                        detail: this.translate.getInstant('systemAdministration.erpModules.modulesList.reorderError'),
                        life: 3000
                    });
                    return;
                }

                const isRegional = this.localStorageService.getPreferredLanguageCode() === 'ar';
                const nameA = isRegional ? (msgA.Name_Regional || msgA.Name || '') : (msgA.Name || '');
                const nameB = isRegional ? (msgB.Name_Regional || msgB.Name || '') : (msgB.Name || '');

                const updateA = this.settingsConfigurationsService.updateModuleDetails(
                    moduleA.id,
                    msgA.Function_ID,
                    msgA.Code || '',
                    nameA,
                    isRegional,
                    newOrderA,
                    msgA.URL ?? '',
                    { silent: true }
                );
                const updateB = this.settingsConfigurationsService.updateModuleDetails(
                    moduleB.id,
                    msgB.Function_ID,
                    msgB.Code || '',
                    nameB,
                    isRegional,
                    newOrderB,
                    msgB.URL ?? '',
                    { silent: true }
                );

                const updateSub = forkJoin({ updateA, updateB }).subscribe({
                    next: (updateResult) => {
                        if (!updateResult.updateA?.success || !updateResult.updateB?.success) {
                            this.messageService.add({
                                severity: 'error',
                                summary: this.translate.getInstant('common.error'),
                                detail: this.translate.getInstant('systemAdministration.erpModules.modulesList.reorderError'),
                                life: 3000
                            });
                            return;
                        }
                        this.messageService.add({
                            severity: 'success',
                            summary: this.translate.getInstant('common.success'),
                            detail: this.translate.getInstant('systemAdministration.erpModules.modulesList.reorderSuccess'),
                            life: 3000
                        });
                        this.loadModules(true, true);
                    },
                    complete: () => {
                        this.reorderInProgressIds.delete(moduleA.id);
                        this.reorderInProgressIds.delete(moduleB.id);
                    }
                });
                this.subscriptions.push(updateSub);
            }
        });

        this.subscriptions.push(sub);
    }
}
