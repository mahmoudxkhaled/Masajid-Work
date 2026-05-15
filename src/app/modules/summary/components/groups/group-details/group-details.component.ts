import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Subscription } from 'rxjs';
import { GroupsService } from '../../../services/groups.service';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';
import { LanguageDirService } from 'src/app/core/services/language-dir.service';
import { PermissionService } from 'src/app/core/services/permission.service';
import { IAccountDetails } from 'src/app/core/models/account-status.model';
import { Group } from '../../../models/groups.model';

@Component({
    selector: 'app-group-details',
    templateUrl: './group-details.component.html',
    styleUrls: ['./group-details.component.scss']
})
export class GroupDetailsComponent implements OnInit, OnDestroy {
    groupId: string = '';
    loading: boolean = false;

    groupDetails: any = null;
    group: Group | null = null;

    currentAccountId: number = 0;

    private subscriptions: Subscription[] = [];

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private groupsService: GroupsService,
        private messageService: MessageService,
        private localStorageService: LocalStorageService,
        private languageDirService: LanguageDirService,
        private permissionService: PermissionService
    ) {
        const accountDetails = this.localStorageService.getAccountDetails() as IAccountDetails;
        this.currentAccountId = accountDetails?.Account_ID || 0;
    }

    ngOnInit(): void {
        this.groupId = this.route.snapshot.paramMap.get('id') || '';
        if (!this.groupId) {
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Invalid group ID.'
            });
            this.router.navigate(['/summary/groups/list']);
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

        const sub = this.groupsService.getGroup(Number(this.groupId)).subscribe({
            next: (response: any) => {
                if (!response?.success) {
                    this.handleBusinessError('details', response);
                    return;
                }
                this.groupDetails = response?.message || {};
                this.mapRawGroup();
                this.loading = false;
            }
        });

        this.subscriptions.push(sub);
    }

    handleGroupUpdated(): void {
        this.loadAllData();
    }

    navigateBack(): void {
        this.router.navigate(['/summary/groups/list']);
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
        return null
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

