import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Subscription } from 'rxjs';
import { RolesService } from '../../../services/roles.service';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';
import { LanguageDirService } from 'src/app/core/services/language-dir.service';
import { EntityRole } from '../../../models/roles.model';
import { EntitiesService } from 'src/app/modules/entity-administration/entities/services/entities.service';

@Component({
    selector: 'app-role-details',
    templateUrl: './role-details.component.html',
    styleUrls: ['./role-details.component.scss']
})
export class RoleDetailsComponent implements OnInit, OnDestroy {
    roleId: string = '';
    loading: boolean = false;
    loadingDetails: boolean = false;
    activeTabIndex: number = 0;

    roleDetails: EntityRole | null = null;
    entityName: string = '';
    accountsList: any[] = [];
    loadingAccounts: boolean = false;
    editRoleDialogVisible: boolean = false;

    get accountsTableValue(): any[] {
        if (this.loadingAccounts && this.accountsList.length === 0) {
            return Array(10).fill(null).map(() => ({}));
        }
        return this.accountsList;
    }

    private subscriptions: Subscription[] = [];
    private rawRole: any = null;
    private rawEntity: any = null;

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private rolesService: RolesService,
        private entitiesService: EntitiesService,
        private messageService: MessageService,
        private localStorageService: LocalStorageService,
        private languageDirService: LanguageDirService
    ) { }

    ngOnInit(): void {
        this.roleId = this.route.snapshot.paramMap.get('id') || '';
        if (!this.roleId) {
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Invalid role ID.'
            });
            this.router.navigate(['/entity-administration/roles/list']);
            return;
        }

        const tabParam = this.route.snapshot.queryParams['tab'];
        if (tabParam !== undefined && tabParam !== null) {
            const tabIndex = parseInt(tabParam, 10);
            if (!isNaN(tabIndex) && tabIndex >= 0) {
                this.activeTabIndex = tabIndex >= 2 ? 1 : Math.min(tabIndex, 1);
            }
        }

        this.subscriptions.push(
            this.languageDirService.userLanguageCode$.subscribe(() => {
                this.mapRawRole();
                this.mapEntityName();
            })
        );
        this.loadAllData();
    }

    ngOnDestroy(): void {
        this.subscriptions.forEach((sub) => sub.unsubscribe());
    }

    loadAllData(): void {
        this.loading = true;
        this.loadingDetails = true;

        const sub = this.rolesService.getEntityRoleDetails(Number(this.roleId)).subscribe({
            next: (response: any) => {
                if (!response?.success) {
                    this.handleBusinessError(response);
                    return;
                }

                this.rawRole = response?.message || {};
                this.mapRawRole();

                if (this.roleDetails?.entityId) {
                    this.loadEntityName(this.roleDetails.entityId);
                }

                this.loadAssignedAccounts();

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

    loadEntityName(entityId: string): void {
        const sub = this.entitiesService.getEntityDetails(entityId).subscribe({
            next: (response: any) => {
                if (response?.success) {
                    this.rawEntity = response?.message || {};
                    this.mapEntityName();
                }
            }
        });
        this.subscriptions.push(sub);
    }

    navigateBack(): void {
        const queryParams = this.route.snapshot.queryParams;
        const entityId = queryParams['entityId'];
        if (entityId) {
            this.router.navigate(['/entity-administration/entities', entityId]);
        } else if (this.roleDetails?.entityId) {
            this.router.navigate(['/entity-administration/entities', this.roleDetails.entityId]);
        } else {
            this.router.navigate(['/entity-administration/roles/list']);
        }
    }

    openEditRoleDialog(): void {
        this.editRoleDialogVisible = true;
    }

    handleRoleUpdated(): void {
        this.loadAllData();
    }

    loadAssignedAccounts(): void {
        if (!this.roleId) {
            return;
        }

        this.loadingAccounts = true;
        const sub = this.rolesService.getRoleAccountsList([Number(this.roleId)], false).subscribe({
            next: (response: any) => {
                if (response?.success) {
                    let accounts: any[] = [];

                    if (Array.isArray(response.message)) {
                        accounts = response.message;
                    } else if (response.message && typeof response.message === 'object') {
                        accounts = Object.keys(response.message).map((key: string) => {
                            const accountId = parseInt(key, 10);
                            const email = response.message[key];
                            return {
                                Account_ID: accountId,
                                Email: email
                            };
                        });
                    }

                    this.accountsList = accounts.map((account: any) => {
                        return {
                            accountId: account.Account_ID || 0,
                            email: account.Email || '',
                            accountState: account.Account_State !== undefined ? account.Account_State : 1
                        };
                    });
                }
                this.loadingAccounts = false;
            },
            error: () => {
                this.loadingAccounts = false;
                this.accountsList = [];
            }
        });

        this.subscriptions.push(sub);
    }

    handleAccountsUpdated(): void {
        this.loadAssignedAccounts();
    }

    private mapRawRole(): void {
        if (!this.rawRole) {
            return;
        }

        const isRegional = this.localStorageService.isArabicUi();
        this.roleDetails = {
            id: String(this.rawRole?.Entity_Role_ID || ''),
            entityId: String(this.rawRole?.Entity_ID || ''),
            title: isRegional ? (this.rawRole?.Title_Regional || this.rawRole?.Title || '') : (this.rawRole?.Title || ''),
            description: isRegional
                ? (this.rawRole?.Description_Regional || this.rawRole?.Description || '')
                : (this.rawRole?.Description || ''),
            titleRegional: this.rawRole?.Title_Regional || '',
            descriptionRegional: this.rawRole?.Description_Regional || '',
            functions: Array.isArray(this.rawRole?.Functions) ? [...this.rawRole.Functions] : undefined,
            modules: Array.isArray(this.rawRole?.Modules) ? [...this.rawRole.Modules] : undefined
        };
    }

    private mapEntityName(): void {
        if (!this.rawEntity) {
            return;
        }

        const isRegional = this.localStorageService.isArabicUi();
        this.entityName = isRegional
            ? (this.rawEntity?.Name_Regional || this.rawEntity?.Name || '')
            : (this.rawEntity?.Name || '');
    }

    private handleBusinessError(response: any): void | null {
        const code = String(response?.message || '');
        let detail = '';

        switch (code) {
            case 'DAP11310':
                detail = 'Invalid Entity Role ID';
                break;
            case 'DAP11305':
                detail = 'Access Denied to Entity Roles';
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
}
