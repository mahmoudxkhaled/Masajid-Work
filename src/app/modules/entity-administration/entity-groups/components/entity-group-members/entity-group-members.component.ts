import { Component, EventEmitter, Input, OnDestroy, OnInit, Output, ViewChild, ElementRef } from '@angular/core';
import { MessageService } from 'primeng/api';
import { Subscription } from 'rxjs';
import { EntityGroupsService } from '../../services/entity-groups.service';
import { EntitiesService } from 'src/app/modules/entity-administration/entities/services/entities.service';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';
import { LanguageDirService } from 'src/app/core/services/language-dir.service';
import { GroupMember, Group } from 'src/app/modules/summary/models/groups.model';
import { EntityAccount } from 'src/app/modules/entity-administration/entities/models/entities.model';

@Component({
    selector: 'app-entity-group-members',
    templateUrl: './entity-group-members.component.html',
    styleUrls: ['./entity-group-members.component.scss']
})
export class EntityGroupMembersComponent implements OnInit, OnDestroy {
    @ViewChild('membersTableContainer') membersTableContainer?: ElementRef;

    @Input() groupId: number = 0;
    @Input() entityId?: number;
    @Output() membersUpdated = new EventEmitter<void>();

    members: GroupMember[] = [];
    loading: boolean = false;
    loadingMembers: boolean = false;

    // Pagination (handled by PrimeNG automatically)
    first: number = 0;
    rows: number = 10;

    // Search functionality
    searchText: string = '';
    filteredMembers: GroupMember[] = [];

    /** When loading and data is empty, return placeholder rows so the table can show skeleton cells. */
    get tableValue(): GroupMember[] {
        if (this.loadingMembers && this.filteredMembers.length === 0) {
            return Array(10).fill(null).map(() => ({} as GroupMember));
        }
        return this.filteredMembers;
    }

    // Account selection dialog
    addMembersDialogVisible: boolean = false;
    accountsForSelection: EntityAccount[] = [];
    selectedAccounts: EntityAccount[] = [];
    loadingAccountsTable: boolean = false;
    accountTableFirst: number = 0;
    accountTableRows: number = 10;
    accountTableTotalRecords: number = 0;
    accountTableTextFilter: string = '';
    selectedEntityId: string = '';
    includeSubentities: boolean = false;

    /** Placeholder rows for dialog accounts table so skeleton cells show while loading. */
    get accountTableValue(): EntityAccount[] {
        if (this.loadingAccountsTable && this.accountsForSelection.length === 0) {
            return Array(10).fill(null).map(() => ({} as EntityAccount));
        }
        return this.accountsForSelection;
    }

    isRegional: boolean = false;
    group: Group | null = null;

    private subscriptions: Subscription[] = [];
    private rawGroup: any = null;

    constructor(
        private entityGroupsService: EntityGroupsService,
        private entitiesService: EntitiesService,
        private messageService: MessageService,
        private localStorageService: LocalStorageService,
        private languageDirService: LanguageDirService
    ) {
        this.isRegional = this.localStorageService.getPreferredLanguageCode() === 'ar';
    }

    ngOnInit(): void {
        this.subscriptions.push(
            this.languageDirService.userLanguageCode$.subscribe(() => {
                this.isRegional = this.localStorageService.getPreferredLanguageCode() === 'ar';
                this.mapRawGroup();
            })
        );
        // Initialize selectedEntityId from @Input() if provided
        if (this.entityId && this.entityId > 0) {
            this.selectedEntityId = this.entityId.toString();
        } else {
            // Fallback to localStorage
            const entityDetails = this.localStorageService.getEntityDetails();
            this.selectedEntityId = entityDetails?.Entity_ID?.toString() || '0';
        }

        if (this.groupId) {
            this.loadGroupInfo();
            this.loadMembers();
        }
    }

    loadGroupInfo(): void {
        if (!this.groupId) {
            return;
        }

        const sub = this.entityGroupsService.getEntityGroup(this.groupId).subscribe({
            next: (response: any) => {
                if (response?.success) {
                    this.rawGroup = response?.message ?? {};
                    this.mapRawGroup();
                }
            }
        });

        this.subscriptions.push(sub);
    }

    ngOnDestroy(): void {
        this.subscriptions.forEach((sub) => sub.unsubscribe());
    }

    private mapRawGroup(): void {
        if (!this.rawGroup) {
            return;
        }

        this.group = {
            id: String(this.rawGroup?.Group_ID || this.rawGroup?.groupID || this.groupId),
            title: this.isRegional
                ? (this.rawGroup?.Title_Regional || this.rawGroup?.title_Regional || this.rawGroup?.Title || this.rawGroup?.title || '')
                : (this.rawGroup?.Title || this.rawGroup?.title || ''),
            description: this.isRegional
                ? (this.rawGroup?.Description_Regional || this.rawGroup?.description_Regional || this.rawGroup?.Description || this.rawGroup?.description || '')
                : (this.rawGroup?.Description || this.rawGroup?.description || ''),
            titleRegional: this.rawGroup?.Title_Regional || this.rawGroup?.title_Regional || '',
            descriptionRegional: this.rawGroup?.Description_Regional || this.rawGroup?.description_Regional || '',
            entityId: this.rawGroup?.Entity_ID || this.rawGroup?.entityID || 0,
            active: Boolean(this.rawGroup?.Is_Active !== undefined ? this.rawGroup.Is_Active : (this.rawGroup?.is_Active !== undefined ? this.rawGroup.is_Active : true)),
            createAccountId: this.rawGroup?.Create_Account_ID || this.rawGroup?.createAccountID || 0
        };
    }

    loadMembers(): void {
        if (!this.groupId) {
            return;
        }

        this.loadingMembers = true;
        const sub = this.entityGroupsService.getGroupMembers(this.groupId, true).subscribe({
            next: (response: any) => {
                if (!response?.success) {
                    this.handleBusinessError('getMembers', response);
                    return;
                }
                // API returns dictionary format: { accountId: email }
                const membersData = response?.message || {};
                this.members = Object.keys(membersData).map((key) => {
                    return {
                        accountId: Number(key),
                        email: membersData[key] || '',
                        entityName: undefined
                    };
                });

                this.applySearchFilter();
                this.loadingMembers = false;
            },
            error: () => {
                this.loadingMembers = false;
            }
        });

        this.subscriptions.push(sub);
    }

    openAddMembersDialog(): void {
        this.addMembersDialogVisible = true;
        this.selectedAccounts = [];
        this.accountTableTextFilter = '';
        this.accountTableFirst = 0;
        this.loadAccountsForSelection();
    }

    closeAddMembersDialog(): void {
        this.addMembersDialogVisible = false;
        this.selectedAccounts = [];
    }

    loadAccountsForSelection(): void {
        this.loadingAccountsTable = true;

        // API uses negative page numbers: -1 = page 1, -2 = page 2, etc.
        const currentPage = Math.floor(this.accountTableFirst / this.accountTableRows) + 1;
        const lastAccountId = -currentPage;

        const sub = this.entitiesService.getEntityAccountsList(
            this.selectedEntityId,
            this.includeSubentities,
            true, // Active accounts only
            lastAccountId,
            this.accountTableRows,
            this.accountTableTextFilter
        ).subscribe({
            next: (response: any) => {
                if (!response?.success) {
                    this.loadingAccountsTable = false;
                    return;
                }

                this.accountTableTotalRecords = Number(response.message?.Total_Count || 0);
                const accountsData = response?.message?.Accounts || {};
                const accountsArray = Array.isArray(accountsData) ? accountsData : Object.values(accountsData);

                this.accountsForSelection = accountsArray.map((account: any) => {
                    return {
                        accountId: String(account?.Account_ID || ''),
                        userId: account?.User_ID || 0,
                        email: account?.Email || '',
                        systemRoleId: account?.System_Role_ID || 0,
                        roleName: '',
                        accountEntityId: account?.Entity_ID || 0,
                        entityRoleId: account?.Entity_Role_ID || 0,
                        entityRoleName: '',
                        accountState: account?.Account_State || 0,
                        Two_FA: account?.Two_FA || false,
                        Last_Login: account?.Last_Login || ''
                    };
                });

                // Filter out accounts already in the group
                const existingAccountIds = this.members.map(m => String(m.accountId));
                this.accountsForSelection = this.accountsForSelection.filter(
                    account => !existingAccountIds.includes(account.accountId)
                );

                this.loadingAccountsTable = false;
            },
            error: () => {
                this.loadingAccountsTable = false;
            }
        });

        this.subscriptions.push(sub);
    }

    onAccountTablePageChange(event: any): void {
        this.accountTableFirst = event.first;
        this.accountTableRows = event.rows;
        this.loadAccountsForSelection();
    }

    onAccountTableSearchInput(event: Event): void {
        const target = event.target as HTMLInputElement;
        const searchValue = target?.value || '';
        this.accountTableTextFilter = searchValue;
        this.accountTableFirst = 0;
        this.loadAccountsForSelection();
    }

    onEntityFilterChange(): void {
        this.accountTableFirst = 0;
        this.loadAccountsForSelection();
    }

    addSelectedMembers(): void {
        if (this.selectedAccounts.length === 0) {
            this.messageService.add({
                severity: 'warn',
                summary: 'No Selection',
                detail: 'Please select at least one account to add.'
            });
            return;
        }

        const accountIds = this.selectedAccounts.map(account => Number(account.accountId));
        this.loading = true;
        console.log('accountIds', accountIds);
        console.log('groupId', this.groupId);
        const sub = this.entityGroupsService.addGroupMembers(this.groupId, accountIds).subscribe({
            next: (response: any) => {
                console.log('response11', response);
                if (!response?.success) {
                    this.handleBusinessError('addMembers', response);
                    return;
                }
                this.messageService.add({
                    severity: 'success',
                    summary: 'Success',
                    detail: `${this.selectedAccounts.length} member(s) added successfully.`,
                    life: 3000
                });

                this.closeAddMembersDialog();
                this.loadMembers();
                this.membersUpdated.emit();
            },
            complete: () => this.loading = false
        });

        this.subscriptions.push(sub);
    }

    removeMember(member: GroupMember): void {
        if (!member.accountId) {
            return;
        }

        this.loading = true;
        const accountIds = [Number(member.accountId)];

        const sub = this.entityGroupsService.removeGroupMembers(this.groupId, accountIds).subscribe({
            next: (response: any) => {
                if (!response?.success) {
                    this.handleBusinessError('removeMember', response);
                    return;
                }

                this.messageService.add({
                    severity: 'success',
                    summary: 'Success',
                    detail: 'Member removed successfully.',
                    life: 3000
                });

                this.loadMembers();
                this.membersUpdated.emit();
            },
            complete: () => this.loading = false
        });

        this.subscriptions.push(sub);
    }


    private handleBusinessError(context: string, response: any): void {
        const code = String(response?.message || '');
        const detail = this.getErrorMessage(context, code);

        if (detail) {
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail
            });
        }
        this.loading = false;
        this.loadingMembers = false;
    }

    private getErrorMessage(context: string, code: string): string | null {
        switch (code) {
            case 'ERP11290':
                return 'Invalid Group ID';
            case 'ERP11288':
                return 'Invalid one or more Account ID';
            default:
                return null;
        }
    }

    onPageChange(event: any): void {
        this.first = event.first;
        this.rows = event.rows;
        // Scroll to top of table when page changes
        this.scrollToTableTop();
    }

    scrollToTableTop(): void {
        // Use setTimeout to ensure the DOM has updated before scrolling
        setTimeout(() => {
            if (this.membersTableContainer) {
                this.membersTableContainer.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }, 0);
    }

    onSearchInput(event: Event): void {
        const target = event.target as HTMLInputElement;
        this.searchText = target?.value || '';
        this.applySearchFilter();
        // Reset to first page when searching
        this.first = 0;
    }

    clearSearch(): void {
        this.searchText = '';
        this.applySearchFilter();
        this.first = 0;
    }

    private applySearchFilter(): void {
        if (!this.searchText || this.searchText.trim() === '') {
            this.filteredMembers = [...this.members];
            return;
        }

        const searchTerm = this.searchText.toLowerCase().trim();
        this.filteredMembers = this.members.filter((member) => {
            const idMatch = String(member.accountId).includes(searchTerm) || false;
            const emailMatch = member.email?.toLowerCase().includes(searchTerm) || false;

            return idMatch || emailMatch;
        });
    }

    getAccountStateSeverity(state: number): string {
        switch (state) {
            case 0:
                return 'secondary'; // Inactive
            case 1:
                return 'success'; // Active
            default:
                return 'info';
        }
    }

    getAccountStateLabel(state: number): string {
        return state === 1 ? 'Active' : 'Inactive';
    }
}
