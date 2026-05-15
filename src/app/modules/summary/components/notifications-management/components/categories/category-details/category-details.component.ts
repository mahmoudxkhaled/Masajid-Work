import { Component, OnInit, OnDestroy } from '@angular/core';
import { MessageService } from 'primeng/api';
import { Subscription } from 'rxjs';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';
import { LanguageDirService } from 'src/app/core/services/language-dir.service';
import { PermissionService } from 'src/app/core/services/permission.service';
import { NotificationCategory } from 'src/app/modules/summary/models/notifications.model';
import { NotificationsService } from 'src/app/modules/summary/services/notifications.service';

@Component({
    selector: 'app-category-details',
    templateUrl: './category-details.component.html',
    styleUrls: ['./category-details.component.scss']
})
export class CategoryDetailsComponent implements OnInit, OnDestroy {
    categoryId: number = 0;
    category: NotificationCategory | null = null;
    loading: boolean = false;
    isSystemCategory: boolean = true;
    private rawCategory: any = null;

    private subscriptions: Subscription[] = [];

    constructor(
        private notificationsService: NotificationsService,
        private messageService: MessageService,
        private localStorageService: LocalStorageService,
        private languageDirService: LanguageDirService,
        private permissionService: PermissionService
    ) { }

    ngOnInit(): void {
        this.subscriptions.push(
            this.languageDirService.userLanguageCode$.subscribe(() => this.mapCategory())
        );
    }

    ngOnDestroy(): void {
        this.subscriptions.forEach((sub) => sub.unsubscribe());
    }

    loadCategory(categoryId: number): void {
        this.categoryId = categoryId;
        // Try System first, then Entity
        this.loading = true;
        const sub = this.notificationsService.getNotificationCategory(this.categoryId).subscribe({
            next: (response: any) => {
                if (response?.success) {
                    this.rawCategory = response.message;
                    this.isSystemCategory = true;
                    this.mapCategory();
                    this.loading = false;
                } else {
                    // Try Entity category
                    this.loadEntityCategory();
                }
            },
            error: () => {
                this.loadEntityCategory();
            }
        });
        this.subscriptions.push(sub);
    }

    loadEntityCategory(): void {
        const sub = this.notificationsService.getEntityNotificationCategory(this.categoryId).subscribe({
            next: (response: any) => {
                if (response?.success) {
                    this.rawCategory = response.message;
                    this.isSystemCategory = false;
                    this.mapCategory();
                } else {
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'Category not found.'
                    });
                }
                this.loading = false;
            },
            error: () => {
                this.loading = false;
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'Category not found.'
                });
            }
        });
        this.subscriptions.push(sub);
    }

    mapCategory(): void {
        const categoryData = this.rawCategory;
        const isRegional = this.localStorageService.getPreferredLanguageCode() === 'ar';
        if (!categoryData) {
            return;
        }

        this.category = {
            id: categoryData?.Category_ID || this.categoryId,
            typeId: categoryData?.Type_ID || 0,
            title: isRegional ? (categoryData?.Title_Regional || categoryData?.Title || '') : (categoryData?.Title || ''),
            description: isRegional
                ? (categoryData?.Description_Regional || categoryData?.Description || '')
                : (categoryData?.Description || ''),
            titleRegional: categoryData?.Title_Regional,
            descriptionRegional: categoryData?.Description_Regional,
            sendEmail: Boolean(categoryData?.Send_Email),
            canBeUnsubscribed: Boolean(categoryData?.Can_Be_Unsubscribed),
            entityId: categoryData?.Entity_ID,
            isSystemCategory: this.isSystemCategory
        };
    }
}
