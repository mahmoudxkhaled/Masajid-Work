import { Component, OnDestroy, OnInit, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Subscription } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';
import { SettingsConfigurationsService } from '../../services/settings-configurations.service';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';
import { TranslationService } from 'src/app/core/services/translation.service';
import { IAccountSettings } from 'src/app/core/models/account-status.model';
import { Function, Module } from '../../models/settings-configurations.model';

@Component({
    selector: 'app-function-details',
    templateUrl: './function-details.component.html',
    styleUrls: ['./function-details.component.scss']
})
export class FunctionDetailsComponent implements OnInit, OnChanges, OnDestroy {
    @Input() functionIdInput: number | null = null;
    @Input() dialogMode: boolean = false;
    @Output() closed = new EventEmitter<void>();
    @Output() editRequested = new EventEmitter<void>();

    private _routeId: number = 0;
    get functionId(): number {
        return this.dialogMode ? (this.functionIdInput ?? 0) : this._routeId;
    }
    loading: boolean = false;
    loadingDetails: boolean = false;

    functionDetails: Function | null = null;
    functionLogoUrl: string | null = null;

    accountSettings: IAccountSettings;
    isRegional: boolean = false;

    modulesForFunction: Module[] = [];
    loadingModules: boolean = false;
    showAddForm: boolean = false;
    newModuleCode: string = '';
    newModuleName: string = '';
    newModuleOrder: number = 1;
    addingModule: boolean = false;

    activateModuleDialog: boolean = false;
    moduleForActivation: Module | null = null;
    activationInProgress: boolean = false;

    moveDialogVisible: boolean = false;
    moveMode: 'toOther' | 'fromOther' = 'toOther';
    moveStep: 1 | 2 | 3 = 1;
    functionsForMove: Function[] = [];
    selectedFunctionForMove: Function | null = null;
    modulesInSelectedFunction: Module[] = [];
    selectedModuleForMove: Module | null = null;
    moveInProgress: boolean = false;

    private subscriptions: Subscription[] = [];

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private settingsConfigurationsService: SettingsConfigurationsService,
        private messageService: MessageService,
        private localStorageService: LocalStorageService,
        private translate: TranslationService,
        private translateService: TranslateService
    ) {
        this.accountSettings = this.localStorageService.getAccountSettings() as IAccountSettings;
        this.isRegional = this.accountSettings?.Language !== 'English';
    }

    ngOnInit(): void {
        if (this.dialogMode) {
            if (!this.functionId || this.functionId === 0) {
                this.closed.emit();
                return;
            }
            this.loadAllData();
            return;
        }
        const idParam = this.route.snapshot.paramMap.get('id');
        this._routeId = idParam ? Number(idParam) : 0;
        if (!this.functionId || this.functionId === 0) {
            this.messageService.add({
                severity: 'error',
                summary: this.translate.getInstant('common.error'),
                detail: this.translate.getInstant('systemAdministration.erpFunctions.functionDetails.invalidFunctionId')
            });
            this.router.navigate(['/system-administration/erp-functions/list']);
            return;
        }
        this.loadAllData();
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (this.dialogMode && changes['functionIdInput'] && this.functionId > 0) {
            this.loadAllData();
        }
    }

    ngOnDestroy(): void {
        this.subscriptions.forEach((sub) => sub.unsubscribe());
    }

    loadAllData(): void {
        this.loading = true;
        this.loadingDetails = true;

        const options = this.dialogMode ? { silent: true } : undefined;
        const sub = this.settingsConfigurationsService.getFunctionDetails(this.functionId, options).subscribe({
            next: (response: any) => {
                console.log('response function details', response);
                if (!response?.success) {
                    this.handleBusinessError(response);
                    return;
                }

                const functionData = response?.message || {};
                const isActive = functionData.Is_Active ?? true;
                this.functionDetails = {
                    id: functionData.Function_ID || 0,
                    code: functionData.Code || '',
                    name: functionData.Name || '',
                    nameRegional: functionData.Name_Regional || '',
                    defaultOrder: functionData.Default_Order,
                    url: functionData.URL || '',
                    isActive: isActive
                };

                this.loadLogo();

                this.loadingDetails = false;
                this.loading = false;
            },
            complete: () => {
                this.loading = false;
                this.loadingDetails = false;
            }
        });

        this.subscriptions.push(sub);
    }

    private loadLogo(): void {
        if (!this.functionId || this.functionId === 0) {
            return;
        }
        const sub = this.settingsConfigurationsService.getFunctionLogo(this.functionId, { silent: true }).subscribe({
            next: (response: any) => {
                if (response?.success && response?.message?.Image?.trim()) {
                    const fmt = response.message.Image_Format || 'png';
                    this.functionLogoUrl = `data:image/${fmt.toLowerCase()};base64,${response.message.Image}`;
                } else {
                    this.functionLogoUrl = null;
                }
            }
        });
        this.subscriptions.push(sub);
    }

    navigateBack(): void {
        if (this.dialogMode) {
            this.closed.emit();
            return;
        }
        this.router.navigate(['/system-administration/erp-functions/list']);
    }

    editFunction(): void {
        if (this.dialogMode) {
            this.editRequested.emit();
            return;
        }
        this.router.navigate(['/system-administration/erp-functions', this.functionId, 'edit']);
    }

    onTabChange(event: { index: number }): void {
        if (event.index === 1) {
            this.loadModulesForFunction();
        }
    }

    loadModulesForFunction(): void {
        if (!this.functionId) return;
        this.loadingModules = true;
        const sub = this.settingsConfigurationsService.getModulesList({ silent: true }).subscribe({
            next: (response: any) => {
                if (response?.success) {
                    const all = this.settingsConfigurationsService.parseModulesList(response, this.isRegional);
                    this.modulesForFunction = all.filter((m) => m.functionId === this.functionId);
                } else {
                    this.modulesForFunction = [];
                }
                this.loadingModules = false;
            },
            error: () => {
                this.modulesForFunction = [];
                this.loadingModules = false;
            }
        });
        this.subscriptions.push(sub);
    }

    onModuleStatusChange(module: Module, event: { checked: boolean }): void {
        this.moduleForActivation = module;
        this.activateModuleDialog = true;
    }

    confirmActivation(): void {
        if (!this.moduleForActivation) return;
        this.activationInProgress = true;
        const obs = this.moduleForActivation.isActive
            ? this.settingsConfigurationsService.deactivateModule(this.moduleForActivation.id)
            : this.settingsConfigurationsService.activateModule(this.moduleForActivation.id);
        const sub = obs.subscribe({
            next: (res: any) => {
                if (res?.success) {
                    this.messageService.add({
                        severity: 'success',
                        summary: this.translate.getInstant('common.success'),
                        detail: this.translate.getInstant('systemAdministration.erpFunctions.functionDetails.modulesTab.toasts.' + (this.moduleForActivation?.isActive ? 'moduleDeactivated' : 'moduleActivated'))
                    });
                    this.activateModuleDialog = false;
                    this.moduleForActivation = null;
                    this.loadModulesForFunction();
                } else {
                    this.messageService.add({
                        severity: 'error',
                        summary: this.translate.getInstant('common.error'),
                        detail: this.translate.getInstant('systemAdministration.erpFunctions.functionDetails.modulesTab.toasts.error')
                    });
                }
                this.activationInProgress = false;
            },
            error: () => {
                this.messageService.add({
                    severity: 'error',
                    summary: this.translate.getInstant('common.error'),
                    detail: this.translate.getInstant('systemAdministration.erpFunctions.functionDetails.modulesTab.toasts.error')
                });
                this.activationInProgress = false;
            }
        });
        this.subscriptions.push(sub);
    }

    submitAddModule(): void {
        const code = (this.newModuleCode || '').trim();
        const name = (this.newModuleName || '').trim();
        if (!code || !name) return;
        this.addingModule = true;
        const sub = this.settingsConfigurationsService.addModule(this.functionId, code, name).subscribe({
            next: (res: any) => {
                if (res?.success) {
                    this.messageService.add({
                        severity: 'success',
                        summary: this.translate.getInstant('common.success'),
                        detail: this.translate.getInstant('systemAdministration.erpFunctions.functionDetails.modulesTab.toasts.moduleAdded')
                    });
                    this.newModuleCode = '';
                    this.newModuleName = '';
                    this.newModuleOrder = 1;
                    this.showAddForm = false;
                    this.loadModulesForFunction();
                } else {
                    this.messageService.add({
                        severity: 'error',
                        summary: this.translate.getInstant('common.error'),
                        detail: this.translate.getInstant('systemAdministration.erpFunctions.functionDetails.modulesTab.toasts.error')
                    });
                }
                this.addingModule = false;
            },
            error: () => {
                this.messageService.add({
                    severity: 'error',
                    summary: this.translate.getInstant('common.error'),
                    detail: this.translate.getInstant('systemAdministration.erpFunctions.functionDetails.modulesTab.toasts.error')
                });
                this.addingModule = false;
            }
        });
        this.subscriptions.push(sub);
    }

    openMoveToDialog(module: Module): void {
        this.moveMode = 'toOther';
        this.moveStep = 1;
        this.selectedModuleForMove = module;
        this.selectedFunctionForMove = null;
        this.loadFunctionsForMove();
        this.moveDialogVisible = true;
    }

    openMoveFromDialog(): void {
        this.moveMode = 'fromOther';
        this.moveStep = 1;
        this.selectedFunctionForMove = null;
        this.selectedModuleForMove = null;
        this.modulesInSelectedFunction = [];
        this.loadFunctionsForMove();
        this.moveDialogVisible = true;
    }

    private loadFunctionsForMove(): void {
        const sub = this.settingsConfigurationsService.getFunctionsList({ silent: true }).subscribe({
            next: (response: any) => {
                if (response?.success) {
                    const all = this.settingsConfigurationsService.parseFunctionsList(response, this.isRegional);
                    this.functionsForMove = all.filter((f) => f.id !== this.functionId);
                } else {
                    this.functionsForMove = [];
                }
            }
        });
        this.subscriptions.push(sub);
    }

    onMoveStep1Next(): void {
        if (this.moveStep === 1 && this.selectedFunctionForMove) {
            this.moveStep = 2;
            this.loadModulesForMoveStep2();
        }
    }

    moveStepNext(): void {
        if (this.moveStep === 1 && this.selectedFunctionForMove) {
            this.moveStep = 2;
            this.loadModulesForMoveStep2();
        } else if (this.moveStep === 2 && this.selectedModuleForMove) {
            this.moveStep = 3;
        }
    }

    onMoveStep2Next(): void {
        this.moveStep = 3;
    }

    moveStepBack(): void {
        if (this.moveStep === 2) this.moveStep = 1;
        else if (this.moveStep === 3) this.moveStep = 2;
    }

    loadModulesForMoveStep2(): void {
        if (this.moveMode === 'fromOther' && this.selectedFunctionForMove) {
            const sub = this.settingsConfigurationsService.getModulesList({ silent: true }).subscribe({
                next: (response: any) => {
                    if (response?.success) {
                        const all = this.settingsConfigurationsService.parseModulesList(response, this.isRegional);
                        this.modulesInSelectedFunction = all.filter((m) => m.functionId === this.selectedFunctionForMove!.id);
                    } else {
                        this.modulesInSelectedFunction = [];
                    }
                }
            });
            this.subscriptions.push(sub);
        }
    }

    getMoveDialogHeader(): string {
        const currentFunctionName = this.functionDetails?.name || '';
        const moduleName = this.selectedModuleForMove?.name || '';
        if (this.moveMode === 'fromOther') {
            return this.translateService.instant('systemAdministration.erpFunctions.functionDetails.modulesTab.moveDialog.titleFrom', { currentFunctionName });
        }
        return this.translateService.instant('systemAdministration.erpFunctions.functionDetails.modulesTab.moveDialog.titleTo', { moduleName });
    }

    getMoveStep1Message(): string {
        const moduleName = this.selectedModuleForMove?.name || '';
        if (this.moveMode === 'toOther') {
            return this.translateService.instant('systemAdministration.erpFunctions.functionDetails.modulesTab.moveDialog.stepSelectFunctionTo', { moduleName });
        }
        return this.translateService.instant('systemAdministration.erpFunctions.functionDetails.modulesTab.moveDialog.stepSelectFunctionFrom');
    }

    getMoveStep2Message(): string {
        const currentFunctionName = this.functionDetails?.name || '';
        return this.translateService.instant('systemAdministration.erpFunctions.functionDetails.modulesTab.moveDialog.stepSelectModule', { currentFunctionName });
    }

    getMoveConfirmMessage(): string {
        const moduleName = this.selectedModuleForMove?.name || '';
        if (this.moveMode === 'toOther') {
            const functionName = this.selectedFunctionForMove?.name || '';
            return this.translateService.instant('systemAdministration.erpFunctions.functionDetails.modulesTab.moveDialog.confirmTo', { moduleName, functionName });
        }
        const functionName = this.functionDetails?.name || '';
        return this.translateService.instant('systemAdministration.erpFunctions.functionDetails.modulesTab.moveDialog.confirmFrom', { moduleName, functionName });
    }

    confirmMove(): void {
        const module = this.selectedModuleForMove;
        if (!module) return;
        const targetFunctionId = this.moveMode === 'toOther' ? (this.selectedFunctionForMove?.id ?? 0) : this.functionId;
        if (!targetFunctionId) return;
        this.moveInProgress = true;
        const sub = this.settingsConfigurationsService.getModuleDetails(module.id).subscribe({
            next: (res: any) => {
                if (!res?.success || !res?.message) {
                    this.messageService.add({
                        severity: 'error',
                        summary: this.translate.getInstant('common.error'),
                        detail: this.translate.getInstant('systemAdministration.erpFunctions.functionDetails.modulesTab.toasts.error')
                    });
                    this.moveInProgress = false;
                    return;
                }
                const msg = res.message;
                const code = msg.Code || '';
                const name = msg.Name || '';
                const nameRegional = msg.Name_Regional || '';
                const isRegional = this.isRegional;
                const defaultOrder = msg.Default_Order ?? 1;
                const url = (msg.URL || '').trim();
                const updateSub = this.settingsConfigurationsService.updateModuleDetails(
                    module.id,
                    targetFunctionId,
                    code,
                    isRegional ? (nameRegional || name) : name,
                    isRegional,
                    defaultOrder,
                    url
                ).subscribe({
                    next: (updateRes: any) => {
                        if (updateRes?.success) {
                            this.messageService.add({
                                severity: 'success',
                                summary: this.translate.getInstant('common.success'),
                                detail: this.translate.getInstant('systemAdministration.erpFunctions.functionDetails.modulesTab.toasts.moduleMoved')
                            });
                            this.closeMoveDialog();
                            this.loadModulesForFunction();
                        } else {
                            this.messageService.add({
                                severity: 'error',
                                summary: this.translate.getInstant('common.error'),
                                detail: this.translate.getInstant('systemAdministration.erpFunctions.functionDetails.modulesTab.toasts.error')
                            });
                        }
                        this.moveInProgress = false;
                    },
                    error: () => {
                        this.messageService.add({
                            severity: 'error',
                            summary: this.translate.getInstant('common.error'),
                            detail: this.translate.getInstant('systemAdministration.erpFunctions.functionDetails.modulesTab.toasts.error')
                        });
                        this.moveInProgress = false;
                    }
                });
                this.subscriptions.push(updateSub);
            },
            error: () => {
                this.messageService.add({
                    severity: 'error',
                    summary: this.translate.getInstant('common.error'),
                    detail: this.translate.getInstant('systemAdministration.erpFunctions.functionDetails.modulesTab.toasts.error')
                });
                this.moveInProgress = false;
            }
        });
        this.subscriptions.push(sub);
    }

    closeMoveDialog(): void {
        this.moveDialogVisible = false;
        this.moveStep = 1;
        this.selectedFunctionForMove = null;
        this.selectedModuleForMove = null;
        this.modulesInSelectedFunction = [];
    }

    private handleBusinessError(response: any): void | null {
        const code = String(response?.message || '');
        let detail = '';

        switch (code) {
            case 'ERP11400':
                detail = this.translate.getInstant('systemAdministration.erpFunctions.functionDetails.invalidFunctionId');
                break;
            default:
                return null;
        }

        if (detail) {
            this.messageService.add({
                severity: 'error',
                summary: this.translate.getInstant('common.error'),
                detail
            });
        }
        this.loading = false;
        return null;
    }
}
