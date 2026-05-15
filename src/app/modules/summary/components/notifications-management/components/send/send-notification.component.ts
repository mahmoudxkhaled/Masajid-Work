import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Subscription } from 'rxjs';
import { take } from 'rxjs/operators';
import { GroupsService } from '../../../../services/groups.service';
import { EntitiesService } from 'src/app/modules/entity-administration/entities/services/entities.service';
import { RolesService } from 'src/app/modules/entity-administration/roles/services/roles.service';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';
import { PermissionService } from 'src/app/core/services/permission.service';
import { Group } from '../../../../models/groups.model';
import { IAccountSettings, IAccountDetails } from 'src/app/core/models/account-status.model';
import { NotificationsService } from '../../../../services/notifications.service';

const DEFAULT_MODULE_ID = 1;

type SendTargetType = 'accounts' | 'groups' | 'roles' | 'entities' | 'all';

interface TemplateOption {
    id: number;
    title: string;
}

@Component({
    selector: 'app-send-notification',
    templateUrl: './send-notification.component.html',
    styleUrls: ['./send-notification.component.scss']
})
export class SendNotificationComponent implements OnInit, OnDestroy {
    /** Current stepper step (0 = Content, 1 = Recipients). 0-based for PrimeNG. */
    activeStep: number = 0;

    /** Step 1: Content. */
    categoryId: number | null = null;
    title: string = '';
    message: string = '';
    referenceType: string | null = null;
    referenceId: number | null = null;

    /** Use existing notification as template (prefill form). */
    templateNotificationId: number | null = null;
    templateList: TemplateOption[] = [];
    /** When true, show "Use as template" dropdown. Hidden when user came from list Send button (templateId in URL). */
    showTemplateDropdown: boolean = true;
    /** Title of the notification used as template (shown in page header when set). */
    usedTemplateTitle: string = '';
    /** When set, template prefill runs after categories are loaded. */
    private pendingTemplateIdFromUrl: number | null = null;

    /** System vs Entity: which create API and categories to use. */
    isSystemNotification: boolean = true;

    /** True until categories for current mode are loaded; then we show form and bind template. */
    loadingCategories: boolean = true;
    loading: boolean = false;
    targetSelectionLoading: boolean = false;
    sending: boolean = false;
    accountSettings: IAccountSettings;
    isRegional: boolean = false;
    currentAccountId: number = 0;
    currentEntityId: number = 0;

    /** Categories for dropdown (system or entity). */
    systemCategories: any[] = [];
    entityCategories: any[] = [];

    referenceTypes: any[] = [
        { label: 'None', value: null },
        { label: 'Image', value: 'Image' },
        { label: 'Document', value: 'Document' },
        { label: 'Link', value: 'Link' },
        { label: 'Workflow', value: 'Workflow' }
    ];

    selectedTargetType: SendTargetType = 'accounts';

    availableAccounts: any[] = [];
    filteredAccounts: any[] = [];
    selectedAccountIds: number[] = [];
    accountSearchFilter: string = '';

    availableGroups: Group[] = [];
    filteredGroups: Group[] = [];
    selectedGroupIds: number[] = [];
    groupSearchFilter: string = '';

    availableRoles: any[] = [];
    filteredRoles: any[] = [];
    selectedRoleIds: number[] = [];
    roleSearchFilter: string = '';

    availableEntities: any[] = [];
    filteredEntities: any[] = [];
    selectedEntityIds: number[] = [];
    entitySearchFilter: string = '';

    private subscriptions: Subscription[] = [];

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private notificationsService: NotificationsService,
        private groupsService: GroupsService,
        private entitiesService: EntitiesService,
        private rolesService: RolesService,
        private messageService: MessageService,
        private localStorageService: LocalStorageService,
        private permissionService: PermissionService
    ) {
        this.accountSettings = this.localStorageService.getAccountSettings() as IAccountSettings;
        this.isRegional = this.accountSettings?.Language !== 'English';
        const accountDetails = this.localStorageService.getAccountDetails() as IAccountDetails;
        this.currentAccountId = accountDetails?.Account_ID || 0;
        this.currentEntityId = this.notificationsService.getCurrentEntityId();
    }

    ngOnInit(): void {
        this.route.queryParams.pipe(take(1)).subscribe(params => {
            const mode = params['mode'] as string;
            const templateIdParam = params['templateId'];
            this.isSystemNotification = mode !== 'entity';
            this.loadCategories();
            this.loadTemplateList();
            if (templateIdParam != null && templateIdParam !== '') {
                const id = Number(templateIdParam);
                if (id > 0) {
                    this.templateNotificationId = id;
                    this.showTemplateDropdown = false;
                    this.pendingTemplateIdFromUrl = id;
                }
            }
        });
    }

    ngOnDestroy(): void {
        this.subscriptions.forEach((sub) => sub.unsubscribe());
    }

    goBack(): void {
        this.router.navigate(['../'], { relativeTo: this.route });
    }

    /** Categories to show in dropdown. */
    get displayCategories(): any[] {
        return this.isSystemNotification ? this.systemCategories : this.entityCategories;
    }

    /** True when categoryId is set and exists in the loaded categories list (so dropdown can show it). */
    get isCategorySelectedAndValid(): boolean {
        if (this.categoryId == null || this.categoryId <= 0) {
            return false;
        }
        return this.displayCategories.some((c: any) => Number(c.Category_ID ?? c.category_ID ?? 0) === this.categoryId);
    }

    private categoryExistsInList(categoryId: number | null): boolean {
        if (categoryId == null) {
            return false;
        }
        return this.displayCategories.some((c: any) => Number(c.Category_ID ?? c.category_ID ?? 0) === categoryId);
    }

    loadCategories(): void {
        if (this.permissionService.canListNotificationCategories()) {
            const sub = this.notificationsService.listNotificationCategories(0, 100).subscribe({
                next: (response: any) => {
                    if (response?.success) {
                        console.log('loadCategories', response);
                        const categories = response?.message?.Categories || response?.message?.Notification_Categories || [];
                        const all = Array.isArray(categories) ? categories : [];
                        const filtered = all.filter((c: any) =>
                            c.Entity_ID === '' || c.Entity_ID == null || c.Entity_ID === undefined
                        );
                        this.systemCategories = filtered.map((c: any) => ({
                            ...c,
                            Category_ID: Number(c.Category_ID ?? c.category_ID ?? 0)
                        }));
                    }
                    if (this.isSystemNotification) {
                        this.loadingCategories = false;
                        this.applyPendingTemplateFromUrl();
                    }
                },
                error: () => {
                    if (this.isSystemNotification) {
                        this.loadingCategories = false;
                    }
                }
            });
            this.subscriptions.push(sub);
        } else if (this.isSystemNotification) {
            this.loadingCategories = false;
        }

        if (this.permissionService.canListEntityNotificationCategories() && this.currentEntityId > 0) {
            const sub = this.notificationsService.listEntityNotificationCategories(this.currentEntityId, 0, 100).subscribe({
                next: (response: any) => {
                    if (response?.success) {
                        const message = response?.message || {};
                        const categories = message?.Categories ?? message?.Notification_Categories ?? [];
                        const arr = Array.isArray(categories) ? categories : [];
                        this.entityCategories = arr.map((c: any) => ({
                            ...c,
                            Category_ID: Number(c.Category_ID ?? c.category_ID ?? 0)
                        }));
                    }
                    if (!this.isSystemNotification) {
                        this.loadingCategories = false;
                        this.applyPendingTemplateFromUrl();
                    }
                },
                error: () => {
                    if (!this.isSystemNotification) {
                        this.loadingCategories = false;
                    }
                }
            });
            this.subscriptions.push(sub);
        } else if (!this.isSystemNotification) {
            this.loadingCategories = false;
        }
    }

    /** Run template prefill after categories are loaded so Category dropdown can bind. */
    private applyPendingTemplateFromUrl(): void {
        if (this.pendingTemplateIdFromUrl == null) {
            return;
        }
        this.pendingTemplateIdFromUrl = null;
        this.onTemplateChange();
    }

    /** Load list of existing notifications for template dropdown. */
    loadTemplateList(): void {
        if (this.isSystemNotification) {
            const sub = this.notificationsService.listNotifications([], [], '', 0, 50).subscribe({
                next: (response: any) => {
                    if (response?.success) {
                        const list = response?.message?.Notifications || response?.message || [];
                        const arr = Array.isArray(list) ? list : [];
                        this.templateList = arr.map((n: any) => ({
                            id: n.Notification_ID ?? n.notification_ID ?? 0,
                            title: n.Title ?? n.title ?? ('#' + (n.Notification_ID ?? n.notification_ID))
                        })).filter((t: TemplateOption) => t.id > 0);
                    }
                }
            });
            this.subscriptions.push(sub);
        } else if (this.currentEntityId > 0) {
            const sub = this.notificationsService.listEntityNotifications(
                this.currentEntityId, [], [], '', 0, 50
            ).subscribe({
                next: (response: any) => {
                    if (response?.success) {
                        const list = response?.message?.Notifications || response?.message || [];
                        const arr = Array.isArray(list) ? list : [];
                        this.templateList = arr.map((n: any) => ({
                            id: n.Notification_ID ?? n.notification_ID ?? 0,
                            title: n.Title ?? n.title ?? ('#' + (n.Notification_ID ?? n.notification_ID))
                        })).filter((t: TemplateOption) => t.id > 0);
                    }
                }
            });
            this.subscriptions.push(sub);
        }
    }

    /** When user selects a template, load that notification and prefill form. */
    onTemplateChange(): void {
        if (!this.templateNotificationId) {
            this.usedTemplateTitle = '';
            return;
        }
        this.loading = true;
        const id = this.templateNotificationId;
        const obs = this.isSystemNotification
            ? this.notificationsService.getNotification(id)
            : this.notificationsService.getEntityNotification(id);
        const sub = obs.subscribe({
            next: (response: any) => {
                this.loading = false;
                if (!response?.success) {
                    return;
                }
                const data = response?.message || response;
                const rawCategory = data.Category_ID ?? data.category_ID;
                const parsedCategoryId = (rawCategory != null && rawCategory !== '') ? Number(rawCategory) : null;
                this.categoryId = this.categoryExistsInList(parsedCategoryId) ? parsedCategoryId : null;
                this.title = data.title ?? data.Title ?? '';
                this.message = data.message ?? data.Message ?? '';
                this.referenceType = data.reference_Type ?? data.Reference_Type ?? null;
                const refId = data.reference_ID ?? data.Reference_ID;
                this.referenceId = refId != null && refId !== '' ? Number(refId) : null;
                const templateTitle = this.isRegional ? (data.Title_Regional ?? data.title ?? data.Title) : (data.title ?? data.Title);
                this.usedTemplateTitle = templateTitle ?? '';
            },
            error: () => {
                this.loading = false;
            }
        });
        this.subscriptions.push(sub);
    }

    /** Step 1 is valid when category (and in displayCategories), title, and message are filled. */
    get isStep1Valid(): boolean {
        const hasCategory = this.isCategorySelectedAndValid;
        const hasTitle = !!this.title?.trim();
        const hasMessage = !!this.message?.trim();
        return hasCategory && hasTitle && hasMessage;
    }

    /** Step 2 is valid when at least one recipient is selected or target is All. */
    get isStep2Valid(): boolean {
        if (this.selectedTargetType === 'all') {
            return true;
        }
        if (this.selectedTargetType === 'accounts') {
            return this.selectedAccountIds.length > 0;
        }
        if (this.selectedTargetType === 'groups') {
            return this.selectedGroupIds.length > 0;
        }
        if (this.selectedTargetType === 'roles') {
            return this.selectedRoleIds.length > 0;
        }
        if (this.selectedTargetType === 'entities') {
            return this.selectedEntityIds.length > 0;
        }
        return false;
    }

    goToStep(step: number): void {
        this.activeStep = step;
        if (step === 1) {
            this.onTargetTypeChange();
        }
    }

    onTargetTypeChange(): void {
        this.selectedAccountIds = [];
        this.selectedGroupIds = [];
        this.selectedRoleIds = [];
        this.selectedEntityIds = [];
        this.accountSearchFilter = '';
        this.groupSearchFilter = '';
        this.roleSearchFilter = '';
        this.entitySearchFilter = '';

        switch (this.selectedTargetType) {
            case 'accounts':
                this.loadAccounts();
                break;
            case 'groups':
                this.loadGroups();
                break;
            case 'roles':
                this.loadRoles();
                break;
            case 'entities':
                this.loadEntities();
                break;
        }
    }

    loadAccounts(): void {
        if (this.currentEntityId <= 0) {
            return;
        }
        this.targetSelectionLoading = true;
        const sub = this.entitiesService.getEntityAccountsList(this.currentEntityId.toString()).subscribe({
            next: (response: any) => {
                if (response?.success) {
                    const accounts = response?.message?.Accounts || [];
                    this.availableAccounts = Array.isArray(accounts) ? accounts : [];
                    this.filteredAccounts = [...this.availableAccounts];
                }
                this.targetSelectionLoading = false;
            },
            error: () => {
                this.targetSelectionLoading = false;
            }
        });
        this.subscriptions.push(sub);
    }

    loadGroups(): void {
        this.targetSelectionLoading = true;
        const sub = this.groupsService.listPersonalGroups(this.currentAccountId, false).subscribe({
            next: (response: any) => {
                if (response?.success) {
                    const groups = Array.isArray(response?.message) ? response.message : [];
                    this.availableGroups = groups.map((g: any) => ({
                        id: String(g.groupID),
                        title: this.isRegional ? (g.title_Regional || g.title) : g.title,
                        description: this.isRegional ? (g.description_Regional || g.description) : g.description,
                        entityId: g.entityID || 0,
                        active: Boolean(g.isActive),
                        createAccountId: g.createAccountID || 0
                    }));
                    this.filteredGroups = [...this.availableGroups];
                }
                this.targetSelectionLoading = false;
            },
            error: () => {
                this.targetSelectionLoading = false;
            }
        });
        this.subscriptions.push(sub);
    }

    loadRoles(): void {
        if (this.currentEntityId <= 0) {
            return;
        }
        this.targetSelectionLoading = true;
        const sub = this.rolesService.listEntityRoles(this.currentEntityId, 0, 100).subscribe({
            next: (response: any) => {
                if (response?.success) {
                    const rolesData = response?.message?.Entity_Roles || {};
                    const rolesArray = Object.values(rolesData).filter((item: any) =>
                        typeof item === 'object' && item !== null && item.Entity_Role_ID !== undefined
                    );
                    this.availableRoles = rolesArray.map((item: any) => ({
                        id: item.Entity_Role_ID,
                        title: this.isRegional ? (item.Title_Regional || item.Title) : item.Title,
                        description: this.isRegional ? (item.Description_Regional || item.Description) : item.Description
                    }));
                    this.filteredRoles = [...this.availableRoles];
                }
                this.targetSelectionLoading = false;
            },
            error: () => {
                this.targetSelectionLoading = false;
            }
        });
        this.subscriptions.push(sub);
    }

    loadEntities(): void {
        this.targetSelectionLoading = true;
        const sub = this.entitiesService.listEntities(0, 100, '', this.permissionService.getCurrentRoleId()).subscribe({
            next: (response: any) => {
                if (response?.success) {
                    const entitiesData = response?.message?.Entities_List || response?.message?.Entities || {};
                    const entitiesArray = Object.values(entitiesData).filter((item: any) =>
                        typeof item === 'object' && item !== null && item.Entity_ID !== undefined
                    );
                    this.availableEntities = entitiesArray.map((item: any) => ({
                        id: item.Entity_ID,
                        code: item.Code || '',
                        name: this.isRegional ? (item.Name_Regional || item.Name) : item.Name,
                        description: this.isRegional ? (item.Description_Regional || item.Description) : item.Description
                    }));
                    this.filteredEntities = [...this.availableEntities];
                }
                this.targetSelectionLoading = false;
            },
            error: () => {
                this.targetSelectionLoading = false;
            }
        });
        this.subscriptions.push(sub);
    }

    canSendToAll(): boolean {
        return this.permissionService.canSendNotificationToAll();
    }

    filterAccounts(): void {
        if (!this.accountSearchFilter?.trim()) {
            this.filteredAccounts = [...this.availableAccounts];
            return;
        }
        const term = this.accountSearchFilter.toLowerCase().trim();
        this.filteredAccounts = this.availableAccounts.filter((account: any) =>
            String(account.Account_ID).toLowerCase().includes(term) ||
            (account.Email && account.Email.toLowerCase().includes(term))
        );
    }

    filterGroups(): void {
        if (!this.groupSearchFilter?.trim()) {
            this.filteredGroups = [...this.availableGroups];
            return;
        }
        const term = this.groupSearchFilter.toLowerCase().trim();
        this.filteredGroups = this.availableGroups.filter((group: Group) =>
            String(group.id).toLowerCase().includes(term) ||
            (group.title && group.title.toLowerCase().includes(term)) ||
            (group.description && group.description.toLowerCase().includes(term))
        );
    }

    filterRoles(): void {
        if (!this.roleSearchFilter?.trim()) {
            this.filteredRoles = [...this.availableRoles];
            return;
        }
        const term = this.roleSearchFilter.toLowerCase().trim();
        this.filteredRoles = this.availableRoles.filter((role: any) =>
            String(role.id).toLowerCase().includes(term) ||
            (role.title && role.title.toLowerCase().includes(term)) ||
            (role.description && role.description.toLowerCase().includes(term))
        );
    }

    filterEntities(): void {
        if (!this.entitySearchFilter?.trim()) {
            this.filteredEntities = [...this.availableEntities];
            return;
        }
        const term = this.entitySearchFilter.toLowerCase().trim();
        this.filteredEntities = this.availableEntities.filter((entity: any) =>
            String(entity.id).toLowerCase().includes(term) ||
            (entity.code && entity.code.toLowerCase().includes(term)) ||
            (entity.name && entity.name.toLowerCase().includes(term)) ||
            (entity.description && entity.description.toLowerCase().includes(term))
        );
    }

    /**
     * Create notification then send (Create = Send).
     * Validates both steps, calls create API, then send API with new ID.
     */
    send(): void {
        if (!this.isStep1Valid) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Validation',
                detail: 'Please complete Step 1: Category, Title, and Message are required.'
            });
            return;
        }
        if (!this.isStep2Valid) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Validation',
                detail: 'Please select at least one recipient.'
            });
            return;
        }

        this.sending = true;
        const categoryId = Number(this.categoryId);
        const title = this.title.trim();
        const message = this.message.trim();
        const referenceType = this.referenceType || null;
        const referenceId = this.referenceId != null ? this.referenceId : null;

        const createObs = this.isSystemNotification
            ? this.notificationsService.createNotification(
                DEFAULT_MODULE_ID,
                categoryId,
                title,
                message,
                referenceType,
                referenceId
            )
            : this.notificationsService.createEntityNotification(
                DEFAULT_MODULE_ID,
                categoryId,
                this.currentEntityId,
                title,
                message,
                referenceType,
                referenceId
            );

        const sub = createObs.subscribe({
            next: (response: any) => {
                if (!response?.success) {
                    this.handleCreateError(response);
                    this.sending = false;
                    return;
                }
                const newId = this.getNewNotificationIdFromResponse(response);
                if (!newId) {
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'Notification was created but ID was not returned.'
                    });
                    this.sending = false;
                    return;
                }
                this.sendToTargets(newId);
            },
            error: () => {
                this.sending = false;
            }
        });
        this.subscriptions.push(sub);
    }

    private getNewNotificationIdFromResponse(response: any): number | null {
        const msg = response?.message;
        if (msg == null) {
            return null;
        }
        const id = msg.Notification_ID ?? msg.notification_ID;
        return id != null ? Number(id) : null;
    }

    private handleCreateError(response: any): void {
        const code = String(response?.message || '');
        let detail: string | null = null;
        if (code === 'ERP11460') detail = 'Invalid Module ID';
        else if (code === 'ERP11461') detail = 'Invalid Notification Title';
        else if (code === 'ERP11462') detail = 'Invalid Notification Message';
        else if (code === 'ERP11463') detail = 'Invalid Reference Type';
        else if (code === 'ERP11464') detail = 'Invalid Reference ID';
        if (detail) {
            this.messageService.add({ severity: 'error', summary: 'Error', detail });
        }
    }

    private sendToTargets(notificationId: number): void {
        let sub: Subscription;

        switch (this.selectedTargetType) {
            case 'accounts':
                const accountIds = this.selectedAccountIds.map((a: any) =>
                    typeof a === 'object' ? a.Account_ID : a
                );
                sub = this.notificationsService.sendNotificationToAccounts(notificationId, accountIds).subscribe({
                    next: (res) => this.handleSendResponse(res)
                });
                break;
            case 'groups':
                const groupIds = this.selectedGroupIds.map((g: any) =>
                    typeof g === 'object' ? Number(g.id) : Number(g)
                );
                sub = this.notificationsService.sendNotificationToGroups(notificationId, groupIds).subscribe({
                    next: (res) => this.handleSendResponse(res)
                });
                break;
            case 'roles':
                const roleIds = this.selectedRoleIds.map((r: any) =>
                    typeof r === 'object' ? r.id : Number(r)
                );
                sub = this.notificationsService.sendNotificationToRoles(notificationId, roleIds).subscribe({
                    next: (res) => this.handleSendResponse(res)
                });
                break;
            case 'entities':
                const entityIds = this.selectedEntityIds.map((e: any) =>
                    typeof e === 'object' ? e.id : Number(e)
                );
                sub = this.notificationsService.sendNotificationToEntities(notificationId, entityIds).subscribe({
                    next: (res) => this.handleSendResponse(res)
                });
                break;
            case 'all':
                sub = this.notificationsService.sendNotificationToAll(notificationId).subscribe({
                    next: (res) => this.handleSendResponse(res)
                });
                break;
            default:
                this.sending = false;
                return;
        }
        this.subscriptions.push(sub);
    }

    private handleSendResponse(response: any): void {
        this.sending = false;

        if (!response?.success) {
            const code = String(response?.message || '');
            let detail: string | null = null;
            if (code === 'ERP11466') detail = 'Invalid Account IDs';
            else if (code === 'ERP11467') detail = 'Invalid Group IDs';
            else if (code === 'ERP11468') detail = 'Invalid Entity Role IDs';
            else if (code === 'ERP11469') detail = 'Invalid Entity IDs';
            if (detail) {
                this.messageService.add({ severity: 'error', summary: 'Error', detail });
            }
            return;
        }

        this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Notification sent successfully.'
        });

        this.selectedAccountIds = [];
        this.selectedGroupIds = [];
        this.selectedRoleIds = [];
        this.selectedEntityIds = [];

        setTimeout(() => this.goBack(), 1500);
    }
}
