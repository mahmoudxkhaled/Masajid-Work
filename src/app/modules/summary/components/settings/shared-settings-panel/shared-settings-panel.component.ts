import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import {
    KNOWN_SETTINGS_SCHEMA,
    KnownSettingOption,
    KnownSettingSchemaEntry,
} from '../../../models/known-settings.schema';
import { TranslationService } from 'src/app/core/services/translation.service';

@Component({
    selector: 'app-shared-settings-panel',
    templateUrl: './shared-settings-panel.component.html',
    styleUrls: ['./shared-settings-panel.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SharedSettingsPanelComponent implements OnChanges {
    @Input() activeKeys: string[] = [];
    @Input() values: Record<string, string> = {};
    @Input() showRemove = false;
    @Input() removeKeyWhitelist: string[] | null = null;
    @Input() refreshableKeys: string[] | null = null;
    @Input() resetToSchemaDefault = false;
    @Input() loading = false;

    @Output() valuesChange = new EventEmitter<Record<string, string>>();
    @Output() removeKey = new EventEmitter<string>();
    @Output() resetKey = new EventEmitter<string>();

    sortedActiveKeys: string[] = [];

    constructor(
        public translate: TranslationService,
        private cdr: ChangeDetectorRef
    ) { }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['activeKeys']) {
            this.sortedActiveKeys = [...(this.activeKeys || [])].sort((a, b) => a.localeCompare(b));
        }
        if (
            changes['activeKeys'] ||
            changes['values'] ||
            changes['refreshableKeys'] ||
            changes['removeKeyWhitelist'] ||
            changes['showRemove'] ||
            changes['resetToSchemaDefault']
        ) {
            this.cdr.markForCheck();
        }
    }

    getSchemaEntry(key: string): KnownSettingSchemaEntry | undefined {
        return KNOWN_SETTINGS_SCHEMA[key];
    }

    getFieldKind(key: string): string {
        const entry = this.getSchemaEntry(key);
        if (!entry) return 'generic';
        return entry.type;
    }

    getSelectOptions(key: string): KnownSettingOption[] {
        return this.getSchemaEntry(key)?.options || [];
    }

    onScalarChange(key: string, value: string): void {
        const next = { ...this.values, [key]: value };
        this.valuesChange.emit(next);
    }

    getNumberValue(key: string): number {
        const n = Number(this.values[key]);
        return Number.isFinite(n) ? n : 0;
    }

    onNumberChange(key: string, value: number | null): void {
        const v = value == null || !Number.isFinite(value) ? '' : String(value);
        this.onScalarChange(key, v);
    }

    onRemoveClick(key: string): void {
        this.removeKey.emit(key);
    }

    onResetClick(key: string): void {
        this.resetKey.emit(key);
    }

    showRefreshButton(key: string): boolean {
        if (this.refreshableKeys?.includes(key)) {
            return true;
        }
        if (!this.resetToSchemaDefault) {
            return false;
        }
        const entry = this.getSchemaEntry(key);
        if (!entry) {
            return false;
        }
        const current = String(this.values?.[key] ?? '');
        const def = String(entry.defaultValue ?? '');
        return current !== def;
    }

    getResetTooltipKey(key: string): string {
        if (this.refreshableKeys?.includes(key)) {
            return 'settings.sharedPanel.resetToDefaultTooltip';
        }
        return 'settings.sharedPanel.resetToCodeDefaultTooltip';
    }

    getResetAriaKey(key: string): string {
        if (this.refreshableKeys?.includes(key)) {
            return 'settings.sharedPanel.resetToDefaultAria';
        }
        return 'settings.sharedPanel.resetToCodeDefaultAria';
    }

    skeletonPlaceholders(): number[] {
        const n = this.sortedActiveKeys.length || 7;
        return Array.from({ length: n }, (_, i) => i);
    }

    showRemoveButton(key: string): boolean {
        if (!this.showRemove) {
            return false;
        }
        if (this.removeKeyWhitelist == null) {
            return true;
        }
        return this.removeKeyWhitelist.includes(key);
    }
}
