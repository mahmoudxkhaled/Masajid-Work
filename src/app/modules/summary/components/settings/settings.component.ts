import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PermissionService } from 'src/app/core/services/permission.service';
import { Roles } from 'src/app/core/models/system-roles';
import { TranslationService } from 'src/app/core/services/translation.service';

type SettingsTabKey = 'account' | 'entity' | 'system';

@Component({
    selector: 'app-settings',
    templateUrl: './settings.component.html',
    styleUrls: ['./settings.component.scss'],
})
export class SettingsComponent implements OnInit {
    activeTabIndex = 0;
    canShowEntityTab = false;
    canShowSystemTab = false;

    constructor(
        public translate: TranslationService,
        private permissionService: PermissionService,
        private route: ActivatedRoute,
        private router: Router
    ) { }

    ngOnInit(): void {
        this.canShowEntityTab = this.permissionService.hasAnyRole([
            Roles.Developer,
            Roles.SystemAdministrator,
            Roles.EntityAdministrator,
        ]);
        this.canShowSystemTab = this.permissionService.hasAnyRole([Roles.Developer]);

        this.activeTabIndex = this.getIndexFromQuery(this.route.snapshot.queryParamMap.get('tab'));
    }

    onTabChange(event: any): void {
        const index = Number(event?.index ?? this.activeTabIndex);
        const tabKey = this.getTabKeyByIndex(index);
        if (!tabKey) {
            return;
        }
        this.router.navigate([], {
            relativeTo: this.route,
            queryParams: { tab: tabKey },
            queryParamsHandling: 'merge',
            replaceUrl: true,
        });
    }

    private getIndexFromQuery(raw: string | null): number {
        const key = String(raw || '').trim().toLowerCase() as SettingsTabKey;
        const desiredKey: SettingsTabKey | null = key === 'account' || key === 'entity' || key === 'system' ? key : null;

        const keys = this.getVisibleTabKeys();
        if (!desiredKey) {
            return 0;
        }
        const idx = keys.indexOf(desiredKey);
        return idx >= 0 ? idx : 0;
    }

    private getVisibleTabKeys(): SettingsTabKey[] {
        const keys: SettingsTabKey[] = ['account'];
        if (this.canShowEntityTab) {
            keys.push('entity');
        }
        if (this.canShowSystemTab) {
            keys.push('system');
        }
        return keys;
    }

    private getTabKeyByIndex(index: number): SettingsTabKey | null {
        const keys = this.getVisibleTabKeys();
        return keys[index] || null;
    }
}
