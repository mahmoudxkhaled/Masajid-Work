import { Component, OnInit, OnDestroy, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Subscription } from 'rxjs';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';
import { IAccountSettings } from 'src/app/core/models/account-status.model';
import { textFieldValidator, getTextFieldError } from 'src/app/core/validators/text-field.validator';
import { SettingsConfigurationsService } from 'src/app/modules/system-administration/settings-configurations.service';
import { Function } from '../../../erp-functions/models/settings-configurations.model';

type ModuleFormContext = 'create' | 'update' | 'details';

@Component({
    selector: 'app-module-form',
    templateUrl: './module-form.component.html',
    styleUrls: ['./module-form.component.scss']
})
export class ModuleFormComponent implements OnInit, OnChanges, OnDestroy {
    @Input() moduleIdInput: number | null = null;
    @Input() dialogMode: boolean = false;
    @Output() saved = new EventEmitter<void>();
    @Output() cancelled = new EventEmitter<void>();

    form!: FormGroup;
    moduleId: number = 0;
    isEdit: boolean = false;
    loading: boolean = false;
    submitted: boolean = false;
    accountSettings: IAccountSettings;
    isRegional: boolean = false;

    // Function selection properties
    functions: Function[] = [];
    selectedFunction?: Function;
    functionDialogVisible: boolean = false;
    loadingFunctions: boolean = false;

    private subscriptions: Subscription[] = [];

    constructor(
        private fb: FormBuilder,
        private settingsConfigurationsService: SettingsConfigurationsService,
        private router: Router,
        private route: ActivatedRoute,
        private messageService: MessageService,
        private localStorageService: LocalStorageService
    ) {
        this.accountSettings = this.localStorageService.getAccountSettings() as IAccountSettings;
        this.isRegional = this.accountSettings?.Language !== 'English';
    }

    ngOnInit(): void {
        if (this.dialogMode) {
            this.moduleId = this.moduleIdInput ?? 0;
            this.isEdit = this.moduleId > 0;
            this.initForm();
            this.loadFunctions();
            if (this.isEdit) {
                this.loadModule();
            }
            return;
        }
        const idParam = this.route.snapshot.paramMap.get('id');
        this.moduleId = idParam ? Number(idParam) : 0;
        this.isEdit = !!this.moduleId && this.moduleId > 0;
        this.initForm();
        this.loadFunctions();
        if (this.isEdit) {
            this.loadModule();
        }
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (this.dialogMode && changes['moduleIdInput'] && this.form) {
            this.moduleId = this.moduleIdInput ?? 0;
            this.isEdit = this.moduleId > 0;
            if (this.isEdit) {
                this.loadModule();
            } else {
                this.form.reset({
                    functionId: 0,
                    code: '',
                    name: '',
                    defaultOrder: 0,
                    url: ''
                });
                this.selectedFunction = undefined;
            }
        }
    }

    ngOnDestroy(): void {
        this.subscriptions.forEach((sub) => sub.unsubscribe());
    }

    initForm(): void {
        this.form = this.fb.group({
            functionId: [0, [Validators.required, Validators.min(1)]],
            code: ['', [Validators.required, Validators.maxLength(10), textFieldValidator()]],
            name: ['', [Validators.required, Validators.maxLength(30), textFieldValidator()]],
            defaultOrder: [0, [Validators.required, Validators.min(1)]],
            url: ['']
        });
    }

    loadFunctions(): void {
        this.loadingFunctions = true;
        const options = this.dialogMode ? { silent: true } : undefined;
        const sub = this.settingsConfigurationsService.getFunctionsList(options).subscribe({
            next: (response: any) => {
                if (response?.success) {
                    this.functions = this.settingsConfigurationsService.parseFunctionsList(response, this.isRegional);
                }
                this.loadingFunctions = false;
            },
            error: () => {
                this.loadingFunctions = false;
            }
        });
        this.subscriptions.push(sub);
    }

    loadModule(): void {
        if (!this.moduleId || this.moduleId === 0) {
            return;
        }

        this.loading = true;
        const options = this.dialogMode ? { silent: true } : undefined;
        const sub = this.settingsConfigurationsService.getModuleDetails(this.moduleId, options).subscribe({
            next: (response: any) => {
                if (!response?.success) {
                    this.handleBusinessError('details', response);
                    return;
                }

                const moduleData = response?.message || {};
                this.form.patchValue({
                    functionId: moduleData.Function_ID || 0,
                    code: moduleData.Code || '',
                    name: this.isRegional ? (moduleData.Name_Regional || moduleData.Name || '') : (moduleData.Name || ''),
                    defaultOrder: moduleData.Default_Order || 0,
                    url: moduleData.URL || ''
                });

                // Set selected function
                const functionId = moduleData.Function_ID || 0;
                if (functionId > 0) {
                    this.selectedFunction = this.functions.find(f => f.id === functionId);
                }
            },
            complete: () => this.loading = false
        });

        this.subscriptions.push(sub);
    }

    submit(): void {
        this.submitted = true;

        if (this.loading) {
            return;
        }

        if (this.form.invalid) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Validation',
                detail: 'Please fill in all required fields correctly.'
            });
            return;
        }

        const { functionId, code, name, defaultOrder, url } = this.form.value;
        const normalizedUrl = url && url.trim().length > 0 ? url.trim() : '/under-development';
        const isRegional = this.accountSettings?.Language !== 'English';

        this.loading = true;

        if (this.isEdit) {
            const sub = this.settingsConfigurationsService.updateModuleDetails(
                this.moduleId,
                Number(functionId),
                code.trim(),
                name.trim(),
                isRegional,
                Number(defaultOrder),
                normalizedUrl
            ).subscribe({
                next: (response: any) => {
                    console.log('updateModuleDetails response', response);
                    if (!response?.success) {
                        this.handleBusinessError('update', response);
                        return;
                    }

                    this.messageService.add({
                        severity: 'success',
                        summary: 'Success',
                        detail: 'Module updated successfully.'
                    });
                    if (this.dialogMode) {
                        this.saved.emit();
                    } else {
                        this.router.navigate(['/system-administration/erp-modules', this.moduleId]);
                    }
                },
                complete: () => this.loading = false
            });

            this.subscriptions.push(sub);
            return;
        }

        const sub = this.settingsConfigurationsService.addModule(
            Number(functionId),
            code.trim(),
            name.trim()
        ).subscribe({
            next: (response: any) => {
                if (!response?.success) {
                    this.handleBusinessError('create', response);
                    return;
                }

                this.messageService.add({
                    severity: 'success',
                    summary: 'Success',
                    detail: 'Module created successfully.'
                });
                if (this.dialogMode) {
                    this.saved.emit();
                } else {
                    const newModuleId = response?.message?.Module_ID;
                    if (newModuleId) {
                        this.router.navigate(['/system-administration/erp-modules', newModuleId]);
                    } else {
                        this.router.navigate(['/system-administration/erp-modules/list']);
                    }
                }
            },
            complete: () => this.loading = false
        });

        this.subscriptions.push(sub);
    }

    cancel(): void {
        if (this.dialogMode) {
            this.cancelled.emit();
            return;
        }
        this.router.navigate(['/system-administration/erp-modules/list']);
    }

    // Function Selection Methods
    openFunctionDialog(): void {
        this.functionDialogVisible = true;
    }

    closeFunctionDialog(): void {
        this.functionDialogVisible = false;
    }

    selectFunction(functionItem: Function): void {
        this.selectedFunction = functionItem;
        this.form.patchValue({
            functionId: functionItem.id
        });
    }

    isFunctionSelected(functionItem: Function): boolean {
        return this.selectedFunction?.id === functionItem.id;
    }

    getFunctionDisplayText(): string {
        const functionId = this.form.get('functionId')?.value || 0;
        if (functionId === 0) {
            return 'Select function';
        }
        if (this.selectedFunction) {
            return `${this.selectedFunction.name} (${this.selectedFunction.code})`;
        }
        const functionItem = this.functions.find(f => f.id === functionId);
        if (functionItem) {
            return `${functionItem.name} (${functionItem.code})`;
        }
        return 'Select function';
    }

    get f() {
        return this.form.controls;
    }

    get codeError(): string {
        const control = this.f['code'];
        if (control?.hasError('required')) {
            return 'Code is required.';
        }
        if (control?.hasError('maxlength')) {
            return 'Code must be 10 characters or less.';
        }
        return getTextFieldError(control, 'Code', this.submitted);
    }

    get nameError(): string {
        const control = this.f['name'];
        if (control?.hasError('required')) {
            return 'Name is required.';
        }
        if (control?.hasError('maxlength')) {
            return 'Name must be 30 characters or less.';
        }
        return getTextFieldError(control, 'Name', this.submitted);
    }

    get functionIdError(): string {
        const control = this.f['functionId'];
        if (control?.hasError('required')) {
            return 'Function is required.';
        }
        if (control?.hasError('min')) {
            return 'Please select a function.';
        }
        return '';
    }

    get defaultOrderError(): string {
        const control = this.f['defaultOrder'];
        if (control?.hasError('required')) {
            return 'Default Order is required.';
        }
        if (control?.hasError('min')) {
            return 'Default Order must be greater than zero.';
        }
        return '';
    }

    private handleBusinessError(context: ModuleFormContext, response: any): void | null {
        const code = String(response?.message || '');
        let detail = '';

        switch (context) {
            case 'create':
                detail = this.getCreationErrorMessage(code) || '';
                break;
            case 'update':
                detail = this.getUpdateErrorMessage(code) || '';
                break;
            case 'details':
                detail = this.getDetailsErrorMessage(code) || '';
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
        this.loading = false;
        return null;
    }

    private getCreationErrorMessage(code: string): string | null {
        switch (code) {
            case 'ERP11400':
                return 'Invalid Function ID';
            case 'ERP11401':
                return 'Invalid Code format, duplicate code, or length > 10 characters';
            case 'ERP11402':
                return 'Invalid Name format, or length > 30 characters';
            default:
                return null;
        }
    }

    private getUpdateErrorMessage(code: string): string | null {
        switch (code) {
            case 'ERP11400':
                return 'Invalid Function ID';
            case 'ERP11410':
                return 'Invalid Module ID';
            case 'ERP11401':
                return 'Invalid Code format';
            case 'ERP11402':
                return 'Invalid Name format';
            case 'ERP11403':
                return 'Invalid Default Order value -> value must be greater than zero';
            case 'ERP11404':
                return 'Invalid URL format';
            default:
                return null;
        }
    }

    private getDetailsErrorMessage(code: string): string | null {
        if (code === 'ERP11410') {
            return 'Invalid Module ID';
        }
        return null;
    }
}
