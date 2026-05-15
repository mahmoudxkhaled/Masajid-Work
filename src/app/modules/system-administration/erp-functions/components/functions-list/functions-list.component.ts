import { Component, OnInit, OnDestroy, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Router } from '@angular/router';
import { MenuItem, MessageService } from 'primeng/api';
import { OverlayPanel } from 'primeng/overlaypanel';
import { Observable, Subscription, forkJoin } from 'rxjs';
import { SettingsConfigurationsService } from '../../services/settings-configurations.service';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';
import { LanguageDirService } from 'src/app/core/services/language-dir.service';
import { TranslationService } from 'src/app/core/services/translation.service';
import { Function, FunctionBackend, Module, ModuleBackend } from '../../models/settings-configurations.model';

type FunctionActionContext = 'list' | 'activate' | 'deactivate' | 'reorder';

@Component({
    selector: 'app-functions-list',
    templateUrl: './functions-list.component.html',
    styleUrls: ['./functions-list.component.scss']
})
export class FunctionsListComponent implements OnInit, OnDestroy {
    @ViewChild('functionsTableContainer') functionsTableContainer?: ElementRef;
    @ViewChild('modulesOverlay') modulesOverlay?: OverlayPanel;

    functions: Function[] = [];
    modulesForPanel: Module[] = [];
    modulesPanelLoading = false;
    isLoading$: Observable<boolean>;
    tableLoadingSpinner = false;
    private subscriptions: Subscription[] = [];
    private rawFunctions: FunctionBackend[] = [];
    private rawModulesForPanel: ModuleBackend[] = [];
    menuItems: MenuItem[] = [];
    currentFunction?: Function;
    activateFunctionDialog: boolean = false;
    currentFunctionForActivation?: Function;
    logoDialogVisible: boolean = false;
    currentFunctionForLogo?: Function;
    detailsDialogVisible: boolean = false;
    currentFunctionForDetails?: Function;
    editDialogVisible: boolean = false;
    currentFunctionForEdit: Function | null = null;
    activationControls: Record<number, FormControl<boolean>> = {};
    reorderInProgressIds = new Set<number>();
    logoCache: Record<number, string> = {};

    // Pagination (handled by PrimeNG automatically)
    first: number = 0;
    rows: number = 10;

    // Search functionality
    searchText: string = '';
    filteredFunctions: Function[] = [];

    /** When loading and filteredFunctions is empty, return placeholder rows so the table can show skeleton cells. */
    get tableValue(): Function[] {
        if (this.tableLoadingSpinner && this.filteredFunctions.length === 0) {
            return Array(10).fill(null).map(() => ({} as Function));
        }
        return this.filteredFunctions;
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
                this.mapRawModulesForPanel(this.currentFunctionForDetails || this.currentFunction);
                this.applySearchFilter();
            })
        );
        this.loadFunctions();
    }

    ngOnDestroy(): void {
        this.subscriptions.forEach((sub) => sub.unsubscribe());
    }

    loadFunctions(forceReload: boolean = false, silent: boolean = false): void {
        if (this.settingsConfigurationsService.isLoadingSubject.value && !forceReload && !silent) {
            return;
        }

        if (!silent) {
            this.tableLoadingSpinner = true;
        }

        const sub = this.settingsConfigurationsService.getFunctionsList(silent ? { silent: true } : undefined).subscribe({
            next: (response: any) => {
                if (!response?.success) {
                    this.handleBusinessError('list', response);
                    return;
                }

                this.rawFunctions = this.getRawFunctions(response);
                this.mapRawFunctions();
                this.applySearchFilter();
                this.buildActivationControls();
                this.loadLogosForList();
            },
            complete: () => this.resetLoadingFlags()
        });

        this.subscriptions.push(sub);
    }

    buildActivationControls(): void {
        this.activationControls = {};
        this.functions.forEach((functionItem) => {
            this.activationControls[functionItem.id] = new FormControl<boolean>(
                functionItem.isActive ?? true,
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
            if (this.functionsTableContainer) {
                this.functionsTableContainer.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }, 0);
    }

    edit(functionItem: Function): void {
        if (functionItem.id) {
            this.currentFunctionForEdit = functionItem;
            this.editDialogVisible = true;
        }
    }

    viewDetails(functionItem: Function): void {
        if (functionItem.id) {
            this.currentFunctionForDetails = functionItem;
            this.detailsDialogVisible = true;
        }
    }

    onDetailsClosed(): void {
        this.detailsDialogVisible = false;
        this.currentFunctionForDetails = undefined;
    }

    onDetailsEditRequested(): void {
        if (this.currentFunctionForDetails) {
            this.currentFunctionForEdit = this.currentFunctionForDetails;
            this.detailsDialogVisible = false;
            this.currentFunctionForDetails = undefined;
            this.editDialogVisible = true;
        }
    }

    onFormSaved(): void {
        this.editDialogVisible = false;
        this.currentFunctionForEdit = null;
        this.loadFunctions(true);
    }

    onFormCancelled(): void {
        this.editDialogVisible = false;
        this.currentFunctionForEdit = null;
    }

    openMenu(menuRef: any, functionItem: Function, event: Event): void {
        this.currentFunction = functionItem;
        menuRef.toggle(event);
    }

    onStatusToggle(functionItem: Function): void {
        this.currentFunctionForActivation = functionItem;
        this.activateFunctionDialog = true;
    }

    onCancelActivationDialog(): void {
        this.activateFunctionDialog = false;
        if (this.currentFunctionForActivation) {
            const control = this.activationControls[this.currentFunctionForActivation.id];
            if (control) {
                control.setValue(this.currentFunctionForActivation.isActive ?? true, { emitEvent: false });
            }
        }
        this.currentFunctionForActivation = undefined;
    }

    activation(value: boolean): void {
        if (!this.currentFunctionForActivation) {
            return;
        }

        const functionItem = this.currentFunctionForActivation;
        const control = this.activationControls[functionItem.id];
        if (!control) {
            return;
        }

        control.disable();
        const action = value ? 'activate' : 'deactivate';
        const apiCall = value
            ? this.settingsConfigurationsService.activateFunction(functionItem.id)
            : this.settingsConfigurationsService.deactivateFunction(functionItem.id);

        const sub = apiCall.subscribe({
            next: (response: any) => {
                if (!response?.success) {
                    this.handleBusinessError(action, response);
                    control.setValue(!value, { emitEvent: false });
                    this.activateFunctionDialog = false;
                    return;
                }

                this.messageService.add({
                    severity: 'success',
                    summary: 'Success',
                    detail: `Function "${functionItem.name}" ${value ? 'activated' : 'deactivated'} successfully.`,
                    life: 3000
                });
                functionItem.isActive = value;
                this.activateFunctionDialog = false;
                this.loadFunctions(true);
            },
            complete: () => {
                control.enable();
                this.currentFunctionForActivation = undefined;
            }
        });

        this.subscriptions.push(sub);
    }

    openLogoDialog(functionItem: Function): void {
        this.currentFunctionForLogo = functionItem;
        this.logoDialogVisible = true;
    }

    openModulesPanel(functionItem: Function, event: Event): void {
        this.modulesPanelLoading = true;
        this.modulesForPanel = [];
        const sub = this.settingsConfigurationsService.getModulesList({ silent: true }).subscribe({
            next: (response: any) => {
                if (response?.success) {
                    this.rawModulesForPanel = this.getRawModules(response);
                    this.mapRawModulesForPanel(functionItem);
                }
                this.modulesPanelLoading = false;
                this.cdr.detectChanges();
                this.modulesOverlay?.toggle(event);
            },
            error: () => {
                this.modulesPanelLoading = false;
                this.cdr.detectChanges();
                this.modulesOverlay?.toggle(event);
            }
        });
        this.subscriptions.push(sub);
    }

    onLogoDialogClose(): void {
        this.logoDialogVisible = false;
        this.currentFunctionForLogo = undefined;
    }

    getLogoUrl(functionItem: Function): string | null {
        return this.logoCache[functionItem.id] ?? null;
    }

    private loadLogosForList(): void {
        this.filteredFunctions.forEach((fn) => {
            if (this.logoCache[fn.id] !== undefined) {
                return;
            }
            const sub = this.settingsConfigurationsService.getFunctionLogo(fn.id, { silent: true }).subscribe({
                next: (response: any) => {
                    if (response?.success && response?.message?.Image?.trim()) {
                        const fmt = response.message.Image_Format || 'png';
                        this.logoCache[fn.id] = `data:image/${fmt.toLowerCase()};base64,${response.message.Image}`;
                    } else {
                        this.logoCache[fn.id] = '';
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

    private mapRawModulesForPanel(functionItem?: Function): void {
        const isRegional = this.localStorageService.getPreferredLanguageCode() === 'ar';
        this.modulesForPanel = this.rawModulesForPanel
            .filter((item) => !functionItem || item.Function_ID === functionItem.id)
            .map((item) => ({
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

    onLogoUpdated(): void {
        if (!this.currentFunctionForLogo?.id) {
            return;
        }
        const id = this.currentFunctionForLogo.id;
        const sub = this.settingsConfigurationsService.getFunctionLogo(id, { silent: true }).subscribe({
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
        this.currentFunctionForEdit = null;
        this.editDialogVisible = true;
    }

    private configureMenuItems(): void {
        this.menuItems = [
            {
                label: this.translate.getInstant('shared.actions.viewDetails'),
                icon: 'pi pi-eye',
                command: () => this.currentFunction && this.viewDetails(this.currentFunction)
            },
            {
                label: this.translate.getInstant('shared.actions.edit'),
                icon: 'pi pi-pencil',
                command: () => this.currentFunction && this.edit(this.currentFunction)
            },
            {
                label: this.translate.getInstant('shared.actions.manageLogo'),
                icon: 'pi pi-image',
                command: () => this.currentFunction && this.openLogoDialog(this.currentFunction)
            },
        ];
    }

    private handleBusinessError(context: FunctionActionContext, response: any): void | null {
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
        // Get_Functions_List (705) has no specific error codes
        return null;
    }

    private getActivationErrorMessage(code: string): string | null {
        switch (code) {
            case 'ERP11400':
                return 'Invalid Function ID';
            case 'ERP11406':
                return 'Function already Active';
            case 'ERP11407':
                return 'Function already Inactive';
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
        let candidates: Function[];
        if (!this.searchText || this.searchText.trim() === '') {
            candidates = [...this.functions];
        } else {
            const searchTerm = this.searchText.toLowerCase().trim();
            candidates = this.functions.filter((functionItem) => {
                const codeMatch = functionItem.code?.toLowerCase().includes(searchTerm) || false;
                const nameMatch = functionItem.name?.toLowerCase().includes(searchTerm) || false;
                const idMatch = String(functionItem.id).includes(searchTerm) || false;
                const urlMatch = functionItem.url?.toLowerCase().includes(searchTerm) || false;
                return codeMatch || nameMatch || idMatch || urlMatch;
            });
        }
        this.filteredFunctions = [...candidates].sort((a, b) => (a.defaultOrder ?? 9999) - (b.defaultOrder ?? 9999));
        this.clampFirstToFilteredLength();
        this.loadLogosForList();
    }

    private clampFirstToFilteredLength(): void {
        const count = this.filteredFunctions.length;
        if (count === 0) {
            this.first = 0;
            return;
        }
        if (this.first >= count) {
            this.first = Math.floor((count - 1) / this.rows) * this.rows;
        }
    }

    isFirstRow(functionItem: Function): boolean {
        return this.filteredFunctions.length > 0 && this.filteredFunctions[0].id === functionItem.id;
    }

    isLastRow(functionItem: Function): boolean {
        return this.filteredFunctions.length > 0 && this.filteredFunctions[this.filteredFunctions.length - 1].id === functionItem.id;
    }

    isReorderInProgress(functionItem: Function): boolean {
        return this.reorderInProgressIds.has(functionItem.id);
    }

    moveUp(functionItem: Function): void {
        const currentIndex = this.filteredFunctions.findIndex((f) => f.id === functionItem.id);
        if (currentIndex <= 0) {
            return;
        }
        const other = this.filteredFunctions[currentIndex - 1];
        const orderA = functionItem.defaultOrder ?? 0;
        const orderB = other.defaultOrder ?? 0;
        this.reorderTwoFunctions(functionItem, other, orderB, orderA);
    }

    moveDown(functionItem: Function): void {
        const currentIndex = this.filteredFunctions.findIndex((f) => f.id === functionItem.id);
        if (currentIndex < 0 || currentIndex >= this.filteredFunctions.length - 1) {
            return;
        }
        const other = this.filteredFunctions[currentIndex + 1];
        const orderA = functionItem.defaultOrder ?? 0;
        const orderB = other.defaultOrder ?? 0;
        this.reorderTwoFunctions(functionItem, other, orderB, orderA);
    }

    private reorderTwoFunctions(funcA: Function, funcB: Function, newOrderA: number, newOrderB: number): void {
        this.reorderInProgressIds.add(funcA.id);
        this.reorderInProgressIds.add(funcB.id);

        const getDetailsA = this.settingsConfigurationsService.getFunctionDetails(funcA.id, { silent: true });
        const getDetailsB = this.settingsConfigurationsService.getFunctionDetails(funcB.id, { silent: true });

        const sub = forkJoin({ detailsA: getDetailsA, detailsB: getDetailsB }).subscribe({
            next: (result) => {
                const msgA = result.detailsA?.message;
                const msgB = result.detailsB?.message;
                if (!result.detailsA?.success || !msgA || !result.detailsB?.success || !msgB) {
                    this.reorderInProgressIds.delete(funcA.id);
                    this.reorderInProgressIds.delete(funcB.id);
                    this.messageService.add({
                        severity: 'error',
                        summary: this.translate.getInstant('common.error'),
                        detail: this.translate.getInstant('systemAdministration.erpFunctions.functionsList.reorderError'),
                        life: 3000
                    });
                    return;
                }

                const isRegional = this.localStorageService.getPreferredLanguageCode() === 'ar';
                const nameA = isRegional ? (msgA.Name_Regional || msgA.Name || '') : (msgA.Name || '');
                const nameB = isRegional ? (msgB.Name_Regional || msgB.Name || '') : (msgB.Name || '');

                const updateA = this.settingsConfigurationsService.updateFunctionDetails(
                    funcA.id,
                    msgA.Code || '',
                    nameA,
                    isRegional,
                    newOrderA,
                    msgA.URL ?? '',
                    { silent: true }
                );
                const updateB = this.settingsConfigurationsService.updateFunctionDetails(
                    funcB.id,
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
                                detail: this.translate.getInstant('systemAdministration.erpFunctions.functionsList.reorderError'),
                                life: 3000
                            });
                            return;
                        }
                        this.messageService.add({
                            severity: 'success',
                            summary: this.translate.getInstant('common.success'),
                            detail: this.translate.getInstant('systemAdministration.erpFunctions.functionsList.reorderSuccess'),
                            life: 3000
                        });
                        this.loadFunctions(true, true);
                    },
                    complete: () => {
                        this.reorderInProgressIds.delete(funcA.id);
                        this.reorderInProgressIds.delete(funcB.id);
                    }
                });
                this.subscriptions.push(updateSub);
            }
        });

        this.subscriptions.push(sub);
    }
}
