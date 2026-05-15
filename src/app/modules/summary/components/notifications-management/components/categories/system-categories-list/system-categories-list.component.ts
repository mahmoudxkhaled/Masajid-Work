import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { MenuItem, MessageService } from 'primeng/api';
import { Observable, Subscription } from 'rxjs';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';
import { LanguageDirService } from 'src/app/core/services/language-dir.service';
import { PermissionService } from 'src/app/core/services/permission.service';
import { TranslationService } from 'src/app/core/services/translation.service';
import { NotificationCategory, NotificationCategoryBackend } from 'src/app/modules/summary/models/notifications.model';
import { NotificationsService } from 'src/app/modules/summary/services/notifications.service';

type CategoryActionContext = 'list' | 'delete';

@Component({
    selector: 'app-system-categories-list',
    templateUrl: './system-categories-list.component.html',
    styleUrls: ['./system-categories-list.component.scss']
})
export class SystemCategoriesListComponent implements OnInit, OnDestroy {
    @ViewChild('categoriesTableContainer') categoriesTableContainer?: ElementRef;

    categories: NotificationCategory[] = [];
    isLoading$: Observable<boolean>;
    tableLoadingSpinner = false;
    private subscriptions: Subscription[] = [];
    private rawCategories: NotificationCategoryBackend[] = [];
    menuItems: MenuItem[] = [];
    currentCategory?: NotificationCategory;
    // Dialog for form
    formDialogVisible: boolean = false;
    formCategoryId?: number;

    // Pagination (handled by PrimeNG automatically)
    first: number = 0;
    rows: number = 10;

    // Search functionality
    searchText: string = '';
    filteredCategories: NotificationCategory[] = [];

    /** When loading and filteredCategories is empty, return placeholder rows so the table can show skeleton cells. */
    get tableValue(): NotificationCategory[] {
        if (this.tableLoadingSpinner && this.filteredCategories.length === 0) {
            return Array(10).fill(null).map(() => ({} as NotificationCategory));
        }
        return this.filteredCategories;
    }

    // Sorting
    sortField: string = '';
    sortOrder: number = 0; // 1 for ascending, -1 for descending, 0 for no sort

    // Pagination (for API)
    lastCategoryId: number = 0;
    totalCount: number = 0;
    filterCount: number = 20;

    // Delete dialog
    deleteCategoryDialog: boolean = false;
    currentCategoryForDelete?: NotificationCategory;

    constructor(
        private notificationsService: NotificationsService,
        private messageService: MessageService,
        private localStorageService: LocalStorageService,
        private languageDirService: LanguageDirService,
        private permissionService: PermissionService,
        private translate: TranslationService
    ) {
        this.isLoading$ = this.notificationsService.isLoadingSubject.asObservable();
    }

    ngOnInit(): void {
        this.configureMenuItems();
        this.subscriptions.push(
            this.languageDirService.userLanguageCode$.subscribe(() => {
                this.mapRawCategories();
                this.applySearchFilter();
            })
        );
        this.loadCategories();
    }

    ngOnDestroy(): void {
        this.subscriptions.forEach((sub) => sub.unsubscribe());
    }

    configureMenuItems(): void {
        this.menuItems = [
            {
                label: this.translate.getInstant('shared.actions.viewDetails'),
                icon: 'pi pi-eye',
                command: () => {
                    if (this.currentCategory) {
                        this.viewDetails(this.currentCategory);
                    }
                }
            },
            {
                label: this.translate.getInstant('shared.actions.edit'),
                icon: 'pi pi-pencil',
                command: () => {
                    if (this.currentCategory) {
                        this.edit(this.currentCategory);
                    }
                }
            },
            {
                label: this.translate.getInstant('shared.actions.delete'),
                icon: 'pi pi-trash',
                command: () => {
                    if (this.currentCategory) {
                        this.confirmDelete(this.currentCategory);
                    }
                }
            }
        ];
    }

    loadCategories(): void {
        this.tableLoadingSpinner = true;

        // Load System Categories only
        const sub = this.notificationsService.listNotificationCategories(this.lastCategoryId, this.filterCount).subscribe({
            next: (response: any) => {
                if (!response?.success) {
                    this.handleBusinessError('list', response);
                    return;
                }

                const responseData = response?.message || response;
                this.totalCount = responseData?.Total_Count || 0;
                const categoriesData = responseData?.Categories || [];
                this.rawCategories = Array.isArray(categoriesData) ? categoriesData as NotificationCategoryBackend[] : [];
                this.mapRawCategories();
                this.applySearchFilter();
            },
            error: () => {
                this.resetLoadingFlags();
            },
            complete: () => {
                this.resetLoadingFlags();
            }
        });
        this.subscriptions.push(sub);
    }

    onPageChange(event: any): void {
        this.first = event.first;
        this.rows = event.rows;
        // Scroll to top of table when page changes
        this.scrollToTableTop();
    }

    onSort(event: any): void {
        this.sortField = event.field;
        this.sortOrder = event.order;
        // PrimeNG will automatically sort the filteredCategories array
        // No need for manual sorting as we're using client-side sorting
    }

    scrollToTableTop(): void {
        // Use setTimeout to ensure the DOM has updated before scrolling
        setTimeout(() => {
            if (this.categoriesTableContainer) {
                this.categoriesTableContainer.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
            this.filteredCategories = [...this.categories];
            return;
        }

        const searchTerm = this.searchText.toLowerCase().trim();
        this.filteredCategories = this.categories.filter((category) => {
            const idMatch = String(category.id).includes(searchTerm) || false;
            const titleMatch = category.title?.toLowerCase().includes(searchTerm) || false;
            const descriptionMatch = category.description?.toLowerCase().includes(searchTerm) || false;
            const sendEmailMatch = (category.sendEmail ? 'yes' : 'no').includes(searchTerm) || false;
            const canUnsubscribeMatch = (category.canBeUnsubscribed ? 'yes' : 'no').includes(searchTerm) || false;

            return idMatch || titleMatch || descriptionMatch || sendEmailMatch || canUnsubscribeMatch;
        });
    }

    navigateToNew(): void {
        this.formCategoryId = undefined;
        this.formDialogVisible = true;
    }

    edit(category: NotificationCategory): void {
        this.formCategoryId = category.id;
        this.formDialogVisible = true;
    }

    viewDetails(category: NotificationCategory): void {
        // Open details in dialog or navigate - for now, just show in dialog
        // Since we're in tabs, we can show details in a dialog
        this.edit(category); // For simplicity, open edit dialog
    }

    openMenu(menu: any, category: NotificationCategory, event: Event): void {
        this.currentCategory = category;
        menu.toggle(event);
    }

    confirmDelete(category: NotificationCategory): void {
        this.currentCategoryForDelete = category;
        this.deleteCategoryDialog = true;
    }

    deleteCategory(): void {
        if (!this.currentCategoryForDelete) {
            return;
        }

        const category = this.currentCategoryForDelete;
        const sub = this.notificationsService.deleteNotificationCategory(category.id).subscribe({
            next: (response: any) => {
                if (!response?.success) {
                    this.handleBusinessError('delete', response);
                    return;
                }

                this.rawCategories = this.rawCategories.filter(c => c.Category_ID !== category.id);
                this.mapRawCategories();
                this.applySearchFilter();
                this.messageService.add({
                    severity: 'success',
                    summary: 'Success',
                    detail: 'Category deleted successfully.'
                });
                this.deleteCategoryDialog = false;
                this.currentCategoryForDelete = undefined;
            }
        });

        this.subscriptions.push(sub);
    }

    onFormDialogClose(): void {
        this.formDialogVisible = false;
        this.formCategoryId = undefined;
    }

    onFormSaved(): void {
        this.onFormDialogClose();
        this.lastCategoryId = 0; // Reset pagination
        this.rawCategories = [];
        this.categories = []; // Clear list to reload
        this.filteredCategories = []; // Clear filtered list
        this.loadCategories();
    }

    canManageCategory(): boolean {
        return this.permissionService.canUpdateNotificationCategory() || this.permissionService.canDeleteNotificationCategory();
    }

    private handleBusinessError(context: CategoryActionContext, response: any): void | null {
        const code = String(response?.message || '');
        let detail: string | null = null;

        switch (context) {
            case 'list':
                detail = this.getListErrorMessage(code);
                break;
            case 'delete':
                detail = this.getDeleteErrorMessage(code);
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

        if (context === 'list') {
            this.resetLoadingFlags();
        }
        return null;
    }

    private getListErrorMessage(code: string): string | null {
        switch (code) {
            case 'ERP11458':
                return 'Filter_Count must be between 5 and 100';
            default:
                return null;
        }
    }

    private getDeleteErrorMessage(code: string): string | null {
        switch (code) {
            case 'ERP11450':
                return 'Invalid Category ID';
            default:
                return null;
        }
    }

    private resetLoadingFlags(): void {
        this.tableLoadingSpinner = false;
    }

    private mapRawCategories(): void {
        const isRegional = this.localStorageService.getPreferredLanguageCode() === 'ar';
        this.categories = this.rawCategories.map((categoryBackend) => {
            const entityId: any = categoryBackend?.Entity_ID;
            const hasEntityId = entityId !== null &&
                entityId !== undefined &&
                entityId !== '' &&
                (typeof entityId === 'string' ? String(entityId).trim() !== '' : Number(entityId) !== 0);

            return {
                id: categoryBackend?.Category_ID || 0,
                typeId: categoryBackend?.Type_ID || 0,
                title: isRegional ? (categoryBackend?.Title_Regional || categoryBackend?.Title || '') : (categoryBackend?.Title || ''),
                description: isRegional
                    ? (categoryBackend?.Description_Regional || categoryBackend?.Description || '')
                    : (categoryBackend?.Description || ''),
                titleRegional: categoryBackend?.Title_Regional,
                descriptionRegional: categoryBackend?.Description_Regional,
                sendEmail: Boolean(categoryBackend?.Send_Email),
                canBeUnsubscribed: Boolean(categoryBackend?.Can_Be_Unsubscribed),
                entityId: hasEntityId ? (typeof entityId === 'number' ? entityId : Number(entityId)) : undefined,
                isSystemCategory: true
            };
        });
    }
}
