import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Subscription } from 'rxjs';
import { EntityGroupsService } from '../../services/entity-groups.service';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';
import { LanguageDirService } from 'src/app/core/services/language-dir.service';
import { PermissionService } from 'src/app/core/services/permission.service';
import { Group } from 'src/app/modules/summary/models/groups.model';

@Component({
    selector: 'app-entity-group-details',
    templateUrl: './entity-group-details.component.html',
    styleUrls: ['./entity-group-details.component.scss']
})
export class EntityGroupDetailsComponent implements OnInit, OnDestroy {
    groupId: string = '';
    loading: boolean = false;

    groupDetails: any = null;
    group: Group | null = null;

    private subscriptions: Subscription[] = [];

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private entityGroupsService: EntityGroupsService,
        private messageService: MessageService,
        private localStorageService: LocalStorageService,
        private languageDirService: LanguageDirService,
        private permissionService: PermissionService
    ) { }

    ngOnInit(): void {
        if (!this.entityGroupsService.isEntityAdmin()) {
            this.messageService.add({
                severity: 'error',
                summary: 'Access Denied',
                detail: 'Only Entity Administrators can access Entity Groups.'
            });
            this.router.navigate(['/entity-administration/entity-groups/list']);
            return;
        }

        this.groupId = this.route.snapshot.paramMap.get('id') || '';
        if (!this.groupId) {
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Invalid group ID.'
            });
            this.router.navigate(['/entity-administration/entity-groups/list']);
            return;
        }

        this.subscriptions.push(
            this.languageDirService.userLanguageCode$.subscribe(() => this.mapRawGroup())
        );
        this.loadAllData();
    }

    ngOnDestroy(): void {
        this.subscriptions.forEach((sub) => sub.unsubscribe());
    }

    loadAllData(): void {
        this.loading = true;

        const sub = this.entityGroupsService.getEntityGroup(Number(this.groupId)).subscribe({
            next: (response: any) => {
                if (!response?.success) {
                    this.handleBusinessError('details', response);
                    return;
                }
                this.groupDetails = response?.message || {};
                this.mapRawGroup();

                if (!this.group || this.group.entityId <= 0) {
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'This is not an Entity Group.'
                    });
                    this.router.navigate(['/entity-administration/entity-groups/list']);
                    return;
                }

                this.loading = false;
            }
        });

        this.subscriptions.push(sub);
    }

    handleGroupUpdated(): void {
        this.loadAllData();
    }

    navigateBack(): void {
        this.router.navigate(['/entity-administration/entities', this.group?.entityId]);
    }

    getGroupIdAsNumber(): number {
        return Number(this.groupId) || 0;
    }

    private mapRawGroup(): void {
        if (!this.groupDetails) {
            return;
        }

        const isRegional = this.localStorageService.getPreferredLanguageCode() === 'ar';
        this.group = {
            id: String(this.groupDetails?.Group_ID || this.groupDetails?.groupID || this.groupId),
            title: isRegional
                ? (this.groupDetails?.Title_Regional || this.groupDetails?.title_Regional || this.groupDetails?.Title || this.groupDetails?.title || '')
                : (this.groupDetails?.Title || this.groupDetails?.title || ''),
            description: isRegional
                ? (this.groupDetails?.Description_Regional || this.groupDetails?.description_Regional || this.groupDetails?.Description || this.groupDetails?.description || '')
                : (this.groupDetails?.Description || this.groupDetails?.description || ''),
            titleRegional: this.groupDetails?.Title_Regional || this.groupDetails?.title_Regional || '',
            descriptionRegional: this.groupDetails?.Description_Regional || this.groupDetails?.description_Regional || '',
            entityId: this.groupDetails?.Entity_ID || this.groupDetails?.entityID || 0,
            active: Boolean(this.groupDetails?.Is_Active !== undefined ? this.groupDetails.Is_Active : (this.groupDetails?.is_Active !== undefined ? this.groupDetails.is_Active : true)),
            createAccountId: this.groupDetails?.Create_Account_ID || this.groupDetails?.createAccountID || 0
        };
    }

    private handleBusinessError(context: string, response: any): void | null {
        const code = String(response?.message || '');
        const detail = this.getErrorMessage(context, code);

        if (detail) {
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail
            });
        }
        return null;
    }

    private getErrorMessage(context: string, code: string): string | null {
        switch (code) {
            case 'ERP11290':
                return 'Invalid Group ID';
            default:
                return null;
        }
    }
}
