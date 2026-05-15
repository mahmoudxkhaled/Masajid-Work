import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { MessageService } from 'primeng/api';
import { forkJoin, Observable, of } from 'rxjs';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';
import { TranslationService } from 'src/app/core/services/translation.service';
import { SettingsLayer } from '../../../models/settings-engine.model';
import {
    buildDefaultValuesForKeys,
    getAccountLayerKeys,
    getAllKnownSettingKeys,
    KNOWN_SETTINGS_SCHEMA,
    mergeDictionaryWithDefaultsForKeys,
} from '../../../models/known-settings.schema';
import { SETTINGS_ERROR_CODES, SettingsApiService } from '../../../services/settings-api.service';
import { SettingsEngineService } from '../../../services/settings-engine.service';
import { AvailableKeyOption, buildAvailableKeyOptions } from '../../../utils/settings-key-utils';

type SectionOperation = 'load' | 'save' | 'remove';

@Component({
    selector: 'app-settings-section',
    templateUrl: './settings-section.component.html',
    styleUrls: ['./settings-section.component.scss'],
})
export class SettingsSectionComponent implements OnInit, OnChanges {
    @Input() layer!: SettingsLayer;
    @Input() titleKey!: string;
    @Input() showRemove = false;
    @Input() allowCustomKey = true;
    @Input() ownerId = 0;
    @Input() syncToEngine = true;
    @Input() fixedKeys?: string[];
    @Input() preloadedData: Record<string, string> | null = null;
    @Input() inheritedDefaults: Record<string, string> | null = null;
    @Input() headerContext = '';
    @Output() reloadParentTab = new EventEmitter<void>();

    activeKeys: string[] = [];
    values: Record<string, string> = {};
    loading = false;
    saving = false;
    addKeyOption: string | null = null;
    availableOptions: AvailableKeyOption[] = [];
    showNewKeyDialog = false;
    newKeyInput = '';

    showRemoveConfirm = false;
    keyToRemove = '';

    showDefaultSaveConfirm = false;

    private persisted: Record<string, string> = {};
    private ownerEntityOrAccountId = 0;
    private defaultsSnapshot: Record<string, string> = {};
    private customOverridesSnapshot: Record<string, string> = {};
    private keysFromCustomApi = new Set<string>();
    private keysAddedLocally = new Set<string>();
    panelTrashWhitelist: string[] | null = null;
    panelRefreshKeyList: string[] = [];

    constructor(
        private settingsApiService: SettingsApiService,
        private settingsEngineService: SettingsEngineService,
        private localStorageService: LocalStorageService,
        public translate: TranslationService,
        private messageService: MessageService
    ) { }

    get panelHeader(): string {
        const title = this.translate.getInstant(this.titleKey);
        const ctx = (this.headerContext || '').trim();
        return ctx ? `${title} (${ctx})` : title;
    }

    get showAddKey(): boolean {
        return !this.fixedKeys;
    }

    get hasUnsavedChanges(): boolean {
        if (this.usesMergedCustomView()) {
            const current = this.serializeDict(this.buildMergedCustomSavePayload());
            const saved = this.serializeDict(this.customOverridesSnapshot || {});
            return current !== saved || this.keysAddedLocally.size > 0;
        }

        const baseline = this.fixedKeys
            ? mergeDictionaryWithDefaultsForKeys(this.activeKeys, this.persisted)
            : this.persisted;

        return this.activeKeys.some((k) => String(this.values?.[k] ?? '') !== String(baseline?.[k] ?? ''));
    }

    ngOnInit(): void {
        this.syncOwnerId();
        if (this.fixedKeys) {
            this.activeKeys = [...this.fixedKeys];
        }
        if (this.usesMergedCustomView() && this.preloadedData != null && this.inheritedDefaults != null) {
            this.applyMergedCustomFromInputs();
        } else if (this.preloadedData != null) {
            this.applyLoadedDictionary(this.preloadedData);
        } else if (this.layer !== 'defaultAccount' && this.layer !== 'defaultEntity') {
            this.load();
        }
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['ownerId']) {
            this.syncOwnerId();
        }
        if (this.usesMergedCustomView()) {
            if (
                (changes['preloadedData'] || changes['inheritedDefaults']) &&
                this.preloadedData != null &&
                this.inheritedDefaults != null
            ) {
                this.applyMergedCustomFromInputs();
            }
            return;
        }
        if (changes['preloadedData'] && this.preloadedData != null) {
            this.applyLoadedDictionary(this.preloadedData);
        }
    }

    private syncOwnerId(): void {
        const override = Number(this.ownerId || 0);
        if (override > 0) {
            this.ownerEntityOrAccountId = override;
            return;
        }
        if (this.layer === 'account') {
            this.ownerEntityOrAccountId = Number(this.localStorageService.getAccountDetails()?.Account_ID || 0);
            return;
        }
        if (this.layer === 'entity') {
            this.ownerEntityOrAccountId = Number(this.localStorageService.getEntityDetails()?.Entity_ID || 0);
            return;
        }
        this.ownerEntityOrAccountId = 0;
    }

    onValuesChange(next: Record<string, string>): void {
        this.values = { ...next };
        if (this.usesMergedCustomView()) {
            this.updateRowActions();
        }
    }

    onResetKey(key: string): void {
        if (!key) {
            return;
        }
        if (this.layer === 'system') {
            const entry = KNOWN_SETTINGS_SCHEMA[key];
            if (!entry) {
                return;
            }
            const defVal = String(entry.defaultValue ?? '');
            this.values = { ...this.values, [key]: defVal };
            return;
        }
        if (!this.usesMergedCustomView()) {
            return;
        }
        const defs = this.defaultsSnapshot;
        const hasDef = (k: string) => Object.prototype.hasOwnProperty.call(defs, k);
        if (hasDef(key) && !this.keysAddedLocally.has(key)) {
            const defVal = String(defs[key] ?? '');
            this.values = { ...this.values, [key]: defVal };
            this.rebuildPersistedForMerged();
            this.updateRowActions();
        }
    }

    addSelectedKey(): void {
        if (!this.addKeyOption) return;
        this.appendKey(this.addKeyOption);
        this.addKeyOption = null;
        this.refreshAvailableOptions();
    }

    openNewKeyDialog(): void {
        this.newKeyInput = '';
        this.showNewKeyDialog = true;
    }

    confirmNewKey(): void {
        const key = (this.newKeyInput || '').trim();
        if (!key || this.activeKeys.includes(key)) {
            this.showNewKeyDialog = false;
            return;
        }
        this.appendKey(key);
        this.showNewKeyDialog = false;
        this.refreshAvailableOptions();
    }

    save(): void {
        if ((this.layer === 'account' || this.layer === 'entity') && !this.ownerEntityOrAccountId) return;

        if (this.usesMergedCustomView()) {
            const payload = this.buildMergedCustomSavePayload();
            this.saving = true;

            const keysToRemove = this.getMergedCustomKeysToRemoveOnSave();
            const remove$ = keysToRemove.length > 0 ? forkJoin(keysToRemove.map((k) => this.getRemoveApiCall(k))) : of([]);

            remove$.subscribe({
                next: (removeResponses: any[]) => {
                    const failures = (removeResponses || []).find((r: any) => r && r.success === false);
                    if (failures) {
                        this.saving = false;
                        this.handleBusinessError('remove', failures);
                        return;
                    }

                    const shouldSet = Object.keys(payload).length > 0 || this.keysAddedLocally.size > 0;
                    if (!shouldSet) {
                        if (this.syncToEngine) {
                            this.settingsEngineService.refreshRuntimeFromServer().subscribe({
                                next: () => {
                                    this.saving = false;
                                    this.reloadParentTab.emit();
                                    this.showSuccessToast(this.getSuccessKey('save'));
                                },
                                error: () => {
                                    this.saving = false;
                                    this.reloadParentTab.emit();
                                    this.showSuccessToast(this.getSuccessKey('save'));
                                },
                            });
                        } else {
                            this.saving = false;
                            this.reloadParentTab.emit();
                            this.showSuccessToast(this.getSuccessKey('save'));
                        }
                        return;
                    }

                    this.getSetApiCall(payload).subscribe({
                        next: (response: any) => {
                            this.saving = false;
                            if (!response?.success) {
                                this.handleBusinessError('save', response);
                                return;
                            }
                            if (this.syncToEngine) {
                                this.settingsEngineService.refreshRuntimeFromServer().subscribe({
                                    next: () => {
                                        this.reloadParentTab.emit();
                                        this.showSuccessToast(this.getSuccessKey('save'));
                                    },
                                    error: () => {
                                        this.reloadParentTab.emit();
                                        this.showSuccessToast(this.getSuccessKey('save'));
                                    },
                                });
                            } else {
                                this.reloadParentTab.emit();
                                this.showSuccessToast(this.getSuccessKey('save'));
                            }
                        },
                        error: () => {
                            this.saving = false;
                        },
                    });
                },
                error: () => {
                    this.saving = false;
                },
            });
            return;
        }

        if (this.layer === 'defaultAccount' || this.layer === 'defaultEntity') {
            this.showDefaultSaveConfirm = true;
            return;
        }

        this.executeNonMergedSave();
    }

    cancelDefaultSave(): void {
        this.showDefaultSaveConfirm = false;
    }

    confirmDefaultSave(): void {
        this.showDefaultSaveConfirm = false;
        this.executeNonMergedSave();
    }

    get defaultSaveConfirmTitleKey(): string {
        return this.layer === 'defaultEntity'
            ? 'settings.sections.defaultEntity.saveConfirmTitle'
            : 'settings.sections.defaultAccount.saveConfirmTitle';
    }

    get defaultSaveConfirmMessageKey(): string {
        return this.layer === 'defaultEntity'
            ? 'settings.sections.defaultEntity.saveConfirmMessage'
            : 'settings.sections.defaultAccount.saveConfirmMessage';
    }

    private executeNonMergedSave(): void {
        const payload: Record<string, string> = {};
        this.activeKeys.forEach((k) => (payload[k] = this.values[k] ?? ''));

        this.saving = true;
        this.getSetApiCall(payload).subscribe({
            next: (response: any) => {
                this.saving = false;
                if (!response?.success) {
                    this.handleBusinessError('save', response);
                    return;
                }
                if (this.layer === 'defaultAccount' || this.layer === 'defaultEntity') {
                    if (this.syncToEngine) {
                        this.settingsEngineService.refreshRuntimeFromServer().subscribe({
                            next: () => {
                                this.reloadParentTab.emit();
                                this.showSuccessToast(this.getSuccessKey('save'));
                            },
                            error: () => {
                                this.reloadParentTab.emit();
                                this.showSuccessToast(this.getSuccessKey('save'));
                            },
                        });
                    } else {
                        this.reloadParentTab.emit();
                        this.showSuccessToast(this.getSuccessKey('save'));
                    }
                    return;
                }
                if (this.syncToEngine) {
                    this.settingsEngineService.refreshRuntimeFromServer().subscribe({
                        next: () => {
                            this.persisted = { ...this.settingsEngineService.getLayer(this.layer) };
                            if (!this.fixedKeys) {
                                this.activeKeys = Object.keys(this.persisted).sort((a, b) => a.localeCompare(b));
                                this.values = this.mergeValuesForKeys(this.activeKeys, this.persisted);
                                this.refreshAvailableOptions();
                            } else {
                                this.values = mergeDictionaryWithDefaultsForKeys(this.activeKeys, this.persisted);
                            }
                            this.showSuccessToast(this.getSuccessKey('save'));
                        },
                        error: () => {
                            this.showSuccessToast(this.getSuccessKey('save'));
                        },
                    });
                } else {
                    this.reloadParentTab.emit();
                    this.showSuccessToast(this.getSuccessKey('save'));
                }
            },
            error: () => {
                this.saving = false;
            },
        });
    }

    requestRemove(key: string): void {
        this.keyToRemove = key;
        this.showRemoveConfirm = true;
    }

    cancelRemove(): void {
        this.keyToRemove = '';
        this.showRemoveConfirm = false;
    }

    confirmRemove(): void {
        const key = this.keyToRemove;
        this.showRemoveConfirm = false;
        this.keyToRemove = '';
        if (!key) return;

        console.log('[settings-section] confirmRemove key', key, 'layer', this.layer);

        if (this.layer === 'defaultAccount' || this.layer === 'defaultEntity') {
            const updatedDict = { ...this.persisted };
            delete updatedDict[key];
            console.log('[settings-section] confirmRemove defaultAccount/defaultEntity — updated dict', updatedDict);
            this.saving = true;
            this.getSetApiCall(updatedDict).subscribe({
                next: (response: any) => {
                    console.log('[settings-section] confirmRemove defaultAccount/defaultEntity — response', response);
                    this.saving = false;
                    if (!response?.success) {
                        this.handleBusinessError('remove', response);
                        return;
                    }
                    this.settingsEngineService.refreshRuntimeFromServer().subscribe({
                        next: () => {
                            this.reloadParentTab.emit();
                            this.showSuccessToast(this.getSuccessKey('remove'));
                        },
                        error: () => {
                            this.reloadParentTab.emit();
                            this.showSuccessToast(this.getSuccessKey('remove'));
                        },
                    });
                },
                error: () => {
                    this.saving = false;
                },
            });
            return;
        }

        if (this.usesMergedCustomView() && this.keysAddedLocally.has(key)) {
            this.keysAddedLocally.delete(key);
            this.activeKeys = this.activeKeys.filter((k) => k !== key);
            const nextValues = { ...this.values };
            delete nextValues[key];
            this.values = nextValues;
            this.rebuildPersistedForMerged();
            this.updateRowActions();
            this.refreshAvailableOptions();
            this.showSuccessToast(this.getSuccessKey('remove'));
            return;
        }

        this.getRemoveApiCall(key).subscribe({
            next: (response: any) => {
                console.log('[settings-section] confirmRemove response', response);
                if (!response?.success) {
                    this.handleBusinessError('remove', response);
                    return;
                }
                if (this.usesMergedCustomView()) {
                    this.settingsEngineService.refreshRuntimeFromServer().subscribe({
                        next: () => {
                            this.reloadParentTab.emit();
                            this.showSuccessToast(this.getSuccessKey('remove'));
                        },
                        error: () => {
                            this.reloadParentTab.emit();
                            this.showSuccessToast(this.getSuccessKey('remove'));
                        },
                    });
                    return;
                }
                if (this.fixedKeys) {
                    if (this.syncToEngine) {
                        this.settingsEngineService.refreshRuntimeFromServer().subscribe({
                            next: () => {
                                const dict = this.settingsEngineService.getLayer(this.layer);
                                this.persisted = { ...dict };
                                this.values = mergeDictionaryWithDefaultsForKeys(this.activeKeys, dict);
                                this.refreshAvailableOptions();
                                this.showSuccessToast(this.getSuccessKey('remove'));
                            },
                            error: () => {
                                this.load();
                            },
                        });
                    } else {
                        this.reloadParentTab.emit();
                        this.showSuccessToast(this.getSuccessKey('remove'));
                    }
                    return;
                }
                this.activeKeys = this.activeKeys.filter((k) => k !== key);
                const nextValues = { ...this.values };
                delete nextValues[key];
                this.values = nextValues;
                this.persisted = { ...this.values };
                this.refreshAvailableOptions();
                if (this.syncToEngine) {
                    this.settingsEngineService.removeLayerKeys(this.layer, [key]);
                    this.settingsEngineService.refreshRuntimeFromServer().subscribe({
                        next: () => {
                            this.showSuccessToast(this.getSuccessKey('remove'));
                        },
                        error: () => {
                            this.showSuccessToast(this.getSuccessKey('remove'));
                        },
                    });
                } else {
                    this.reloadParentTab.emit();
                    this.showSuccessToast(this.getSuccessKey('remove'));
                }
            },
            error: () => {
            },
        });
    }

    // #region Load
    private load(): void {
        this.loading = true;
        this.getLoadApiCall().subscribe({
            next: (response: any) => {
                this.loading = false;
                if (!response?.success) {
                    this.handleBusinessError('load', response);
                    if (!this.fixedKeys) {
                        this.activeKeys = [];
                        this.values = {};
                    }
                    return;
                }
                const dict = this.extractLoadDictionary(response);
                this.persisted = { ...dict };
                if (this.fixedKeys) {
                    this.values = mergeDictionaryWithDefaultsForKeys(this.activeKeys, dict);
                    this.settingsEngineService.replaceLayer(this.layer, this.values);
                } else {
                    this.activeKeys = Object.keys(dict).sort((a, b) => a.localeCompare(b));
                    this.values = this.mergeValuesForKeys(this.activeKeys, dict);
                    this.settingsEngineService.replaceLayer(this.layer, dict);
                    this.refreshAvailableOptions();
                }
            },
            error: () => {
                this.loading = false;
                if (this.fixedKeys) {
                    this.values = buildDefaultValuesForKeys(this.activeKeys);
                } else {
                    this.activeKeys = [];
                    this.values = {};
                }
            },
        });
    }
    // #endregion

    // #region API call selectors
    private getLoadApiCall(): Observable<any> {
        switch (this.layer) {
            case 'account':
                return this.settingsApiService.getAccountSettings(this.ownerEntityOrAccountId);
            case 'entity':
                return this.settingsApiService.getEntitySettings(this.ownerEntityOrAccountId);
            case 'system':
                return this.settingsApiService.getERPSystemSettings();
            default:
                return of({ success: false });
        }
    }

    private getSetApiCall(payload: Record<string, string>): Observable<any> {
        switch (this.layer) {
            case 'defaultAccount':
                return this.settingsApiService.setDefaultAccountSettings(payload);
            case 'account':
                return this.settingsApiService.setAccountSettings(this.ownerEntityOrAccountId, payload);
            case 'defaultEntity':
                return this.settingsApiService.setDefaultEntitySettings(payload);
            case 'entity':
                return this.settingsApiService.setEntitySettings(this.ownerEntityOrAccountId, payload);
            case 'system':
                return this.settingsApiService.setERPSystemSettings(payload);
        }
    }

    private getRemoveApiCall(key: string): Observable<any> {
        switch (this.layer) {
            case 'account':
                return this.settingsApiService.removeAccountSetting(this.ownerEntityOrAccountId, key);
            case 'entity':
                return this.settingsApiService.removeEntitySetting(this.ownerEntityOrAccountId, key);
            case 'system':
                return this.settingsApiService.removeERPSystemSetting(key);
            default:
                return of({ success: false });
        }
    }
    // #endregion

    // #region Key management
    private appendKey(key: string): void {
        if (this.activeKeys.includes(key)) return;
        this.activeKeys = [...this.activeKeys, key].sort((a, b) => a.localeCompare(b));
        const defaults = buildDefaultValuesForKeys([key]);
        this.values = { ...this.values, [key]: defaults[key] ?? '' };
        if (this.usesMergedCustomView()) {
            this.keysAddedLocally.add(key);
            this.rebuildPersistedForMerged();
            this.updateRowActions();
        }
    }

    private refreshAvailableOptions(): void {
        const schemaKeys = this.layer === 'system' ? getAllKnownSettingKeys() : getAccountLayerKeys();
        this.availableOptions = buildAvailableKeyOptions(schemaKeys, this.persisted, this.activeKeys);
    }

    private mergeValuesForKeys(keys: string[], dict: Record<string, string>): Record<string, string> {
        const out: Record<string, string> = {};
        keys.forEach((key) => {
            const raw = dict[key];
            if (KNOWN_SETTINGS_SCHEMA[key]) {
                out[key] = raw !== undefined && raw !== null && raw !== '' ? String(raw) : KNOWN_SETTINGS_SCHEMA[key].defaultValue;
            } else {
                out[key] = raw !== undefined && raw !== null ? String(raw) : '';
            }
        });
        return out;
    }
    // #endregion

    // #region Error handling
    private handleBusinessError(context: SectionOperation, response: any): void {
        const code = String(response?.message || '');
        const detail = this.getErrorDetail(context, code);
        if (!detail) return;
        this.messageService.add({
            severity: 'error',
            summary: this.translate.getInstant('common.error'),
            detail,
        });
    }

    private getErrorDetail(context: SectionOperation, code: string): string | null {
        switch (code) {
            case SETTINGS_ERROR_CODES.EMPTY_KEY:
                return this.translate.getInstant('settings.messages.errors.emptyKey');
            case SETTINGS_ERROR_CODES.EMPTY_VALUE:
                return this.translate.getInstant('settings.messages.errors.emptyValue');
            case SETTINGS_ERROR_CODES.INVALID_ACCOUNT_ID:
                return this.translate.getInstant('settings.messages.errors.invalidAccountId');
            case SETTINGS_ERROR_CODES.INVALID_ENTITY_ID:
                return this.translate.getInstant('settings.messages.errors.invalidEntityId');
            case SETTINGS_ERROR_CODES.NOT_FOUND:
                return this.translate.getInstant('settings.messages.errors.settingNotFound');
            default:
                if (context === 'load') {
                    return this.translate.getInstant('settings.messages.errors.loadFailed');
                }
                return this.translate.getInstant('settings.messages.errors.generic');
        }
    }

    private getSuccessKey(context: 'save' | 'remove'): string {
        switch (`${this.layer}:${context}`) {
            case 'defaultAccount:save':
                return 'settings.sections.defaultAccount.saveSuccess';
            case 'defaultAccount:remove':
                return 'settings.sections.defaultAccount.removeSuccess';
            case 'account:save':
                return 'settings.sections.accountCustom.saveSuccess';
            case 'account:remove':
                return 'settings.sections.accountCustom.removeSuccess';
            case 'defaultEntity:save':
                return 'settings.sections.defaultEntity.saveSuccess';
            case 'defaultEntity:remove':
                return 'settings.sections.defaultEntity.removeSuccess';
            case 'entity:save':
                return 'settings.sections.entityCustom.saveSuccess';
            case 'entity:remove':
                return 'settings.sections.entityCustom.removeSuccess';
            case 'system:save':
                return 'settings.system.messages.saveSuccess';
            case 'system:remove':
                return 'settings.system.messages.removeSuccess';
            default:
                return 'settings.messages.saveSuccess';
        }
    }

    private showSuccessToast(key: string): void {
        this.messageService.add({
            severity: 'success',
            summary: this.translate.getInstant('common.success'),
            detail: this.translate.getInstant(key),
        });
    }

    private serializeDict(dict: Record<string, string>): string {
        const keys = Object.keys(dict || {}).sort((a, b) => a.localeCompare(b));
        const normalized: Record<string, string> = {};
        keys.forEach((k) => (normalized[k] = String(dict[k] ?? '')));
        return JSON.stringify(normalized);
    }

    private extractLoadDictionary(response: any): Record<string, string> {
        if (!response?.success || !response?.message) {
            return {};
        }
        const msg = response.message;
        if (this.layer === 'account' && msg && typeof msg === 'object' && !Array.isArray(msg)) {
            if ('Account_Settings' in msg) {
                return this.mapValuesToStringDict(msg.Account_Settings);
            }
            if ('account_Settings' in msg) {
                return this.mapValuesToStringDict(msg.account_Settings);
            }
        }
        if (this.layer === 'entity' && msg && typeof msg === 'object' && !Array.isArray(msg)) {
            if ('Entity_Settings' in msg) {
                return this.mapValuesToStringDict(msg.Entity_Settings);
            }
            if ('entity_Settings' in msg) {
                return this.mapValuesToStringDict(msg.entity_Settings);
            }
        }
        return this.settingsEngineService.extractDictionaryFromApiResponse(response);
    }

    private mapValuesToStringDict(raw: any): Record<string, string> {
        if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
            return {};
        }
        return Object.keys(raw).reduce((acc: Record<string, string>, key: string) => {
            const value = raw[key];
            acc[key] = value == null ? '' : String(value);
            return acc;
        }, {});
    }

    private applyLoadedDictionary(dict: Record<string, string>): void {
        this.panelTrashWhitelist = null;
        this.panelRefreshKeyList = [];
        this.persisted = { ...dict };
        if (this.fixedKeys) {
            this.values = mergeDictionaryWithDefaultsForKeys(this.activeKeys, dict);
            if (this.syncToEngine) {
                this.settingsEngineService.replaceLayer(this.layer, this.values);
            }
        } else {
            this.activeKeys = Object.keys(dict).sort((a, b) => a.localeCompare(b));
            this.values = this.mergeValuesForKeys(this.activeKeys, dict);
            if (this.syncToEngine) {
                this.settingsEngineService.replaceLayer(this.layer, dict);
            }
            this.refreshAvailableOptions();
        }
    }

    private usesMergedCustomView(): boolean {
        return (this.layer === 'account' || this.layer === 'entity') && this.inheritedDefaults != null;
    }

    private applyMergedCustomFromInputs(): void {
        const defs = { ...(this.inheritedDefaults ?? {}) };
        const custom = { ...(this.preloadedData ?? {}) };
        this.defaultsSnapshot = defs;
        this.customOverridesSnapshot = custom;
        this.keysFromCustomApi = new Set(Object.keys(custom));
        this.keysAddedLocally.clear();

        const union = this.uniqueSortedKeys([...Object.keys(defs), ...Object.keys(custom)]);
        this.activeKeys = union;
        const mergedDict: Record<string, string> = {};
        union.forEach((k) => {
            if (Object.prototype.hasOwnProperty.call(custom, k)) {
                mergedDict[k] = custom[k] ?? '';
            } else {
                mergedDict[k] = defs[k] ?? '';
            }
        });
        this.values = this.mergeValuesForKeys(union, mergedDict);
        this.rebuildPersistedForMerged();
        if (this.syncToEngine) {
            this.settingsEngineService.replaceLayer(this.layer, { ...custom });
        }
        this.updateRowActions();
        this.refreshAvailableOptions();
    }

    private uniqueSortedKeys(keys: string[]): string[] {
        return [...new Set(keys)].sort((a, b) => a.localeCompare(b));
    }

    private rebuildPersistedForMerged(): void {
        const m: Record<string, string> = {};
        this.activeKeys.forEach((k) => (m[k] = this.values[k] ?? ''));
        this.persisted = m;
    }

    private updateRowActions(): void {
        this.panelTrashWhitelist = null;
        this.panelRefreshKeyList = [];
        if (!this.showRemove || !this.usesMergedCustomView()) {
            return;
        }
        const defs = this.defaultsSnapshot;
        const hasDef = (k: string) => Object.prototype.hasOwnProperty.call(defs, k);
        const trash: string[] = [];
        for (const k of this.activeKeys) {
            if (this.keysAddedLocally.has(k)) {
                trash.push(k);
            } else if (this.keysFromCustomApi.has(k) && !hasDef(k)) {
                trash.push(k);
            }
        }
        this.panelTrashWhitelist = trash;
        const trashSet = new Set(trash);
        const refresh: string[] = [];
        for (const k of this.activeKeys) {
            if (trashSet.has(k) || !hasDef(k)) {
                continue;
            }
            const cur = String(this.values[k] ?? '');
            const def = String(defs[k] ?? '');
            if (cur !== def) {
                refresh.push(k);
            }
        }
        this.panelRefreshKeyList = refresh;
    }

    private buildMergedCustomSavePayload(): Record<string, string> {
        const out: Record<string, string> = {};
        const defs = this.defaultsSnapshot;
        for (const k of this.activeKeys) {
            const v = this.values[k] ?? '';
            const inCustom = this.keysFromCustomApi.has(k);
            const fromLocalAdd = this.keysAddedLocally.has(k);
            const defVal = Object.prototype.hasOwnProperty.call(defs, k) ? String(defs[k] ?? '') : undefined;
            if (fromLocalAdd) {
                out[k] = v;
                continue;
            }
            if (inCustom) {
                if (defVal !== undefined && String(v) === defVal) {
                    continue;
                }
                out[k] = v;
            } else if (defVal !== undefined && String(v) !== defVal) {
                out[k] = v;
            }
        }
        return out;
    }

    private getMergedCustomKeysToRemoveOnSave(): string[] {
        if (!this.usesMergedCustomView()) {
            return [];
        }
        const defs = this.defaultsSnapshot;
        const hasDef = (k: string) => Object.prototype.hasOwnProperty.call(defs, k);
        const keys: string[] = [];
        for (const k of this.activeKeys) {
            if (this.keysAddedLocally.has(k)) {
                continue;
            }
            if (!this.keysFromCustomApi.has(k)) {
                continue;
            }
            if (!hasDef(k)) {
                continue;
            }
            const cur = String(this.values[k] ?? '');
            const def = String(defs[k] ?? '');
            if (cur === def) {
                keys.push(k);
            }
        }
        return keys;
    }
    // #endregion
}
