import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Subscription } from 'rxjs';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';
import { LanguageDirService } from 'src/app/core/services/language-dir.service';
import { PermissionService } from 'src/app/core/services/permission.service';
import { NotificationsService } from '../../../services/notifications.service';
import { Notification } from '../../../models/notifications.model';

@Component({
    selector: 'app-notification-details',
    templateUrl: './notification-details.component.html',
    styleUrls: ['./notification-details.component.scss']
})
export class NotificationDetailsComponent implements OnInit, OnDestroy {
    notificationId: number = 0;
    notification: Notification | null = null;
    loading: boolean = false;
    isSystemNotification: boolean = true;
    private rawNotification: any = null;

    private subscriptions: Subscription[] = [];

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private notificationsService: NotificationsService,
        private messageService: MessageService,
        private localStorageService: LocalStorageService,
        private languageDirService: LanguageDirService,
        private permissionService: PermissionService
    ) { }

    ngOnInit(): void {
        this.subscriptions.push(
            this.languageDirService.userLanguageCode$.subscribe(() => this.mapNotification())
        );
        this.route.params.subscribe(params => {
            this.notificationId = Number(params['id']);
            if (this.notificationId) {
                this.loadNotification();
            }
        });
    }

    ngOnDestroy(): void {
        this.subscriptions.forEach((sub) => sub.unsubscribe());
    }

    loadNotification(): void {
        // Try System first, then Entity
        this.loading = true;
        const sub = this.notificationsService.getNotification(this.notificationId).subscribe({
            next: (response: any) => {
                if (response?.success) {
                    this.rawNotification = response.message;
                    this.isSystemNotification = true;
                    this.mapNotification();
                    this.loading = false;
                } else {
                    // Try Entity notification
                    this.loadEntityNotification();
                }
            },
            error: () => {
                this.loadEntityNotification();
            }
        });
        this.subscriptions.push(sub);
    }

    loadEntityNotification(): void {
        const sub = this.notificationsService.getEntityNotification(this.notificationId).subscribe({
            next: (response: any) => {
                if (response?.success) {
                    this.rawNotification = response.message;
                    this.isSystemNotification = false;
                    this.mapNotification();
                } else {
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'Notification not found.'
                    });
                    this.router.navigate(['/summary/notifications/notifications']);
                }
                this.loading = false;
            },
            error: () => {
                this.loading = false;
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'Notification not found.'
                });
                this.router.navigate(['/summary/notifications/notifications']);
            }
        });
        this.subscriptions.push(sub);
    }

    mapNotification(): void {
        const notificationData = this.rawNotification;
        const isRegional = this.localStorageService.getPreferredLanguageCode() === 'ar';
        if (!notificationData) {
            return;
        }

        this.notification = {
            id: notificationData?.Notification_ID || this.notificationId,
            moduleId: notificationData?.Module_ID || 0,
            typeId: notificationData?.Type_ID || 0,
            categoryId: notificationData?.Category_ID || 0,
            entityId: notificationData?.Entity_ID,
            title: isRegional ? (notificationData?.Title_Regional || notificationData?.Title || '') : (notificationData?.Title || ''),
            message: isRegional
                ? (notificationData?.Message_Regional || notificationData?.Message || '')
                : (notificationData?.Message || ''),
            titleRegional: notificationData?.Title_Regional,
            messageRegional: notificationData?.Message_Regional,
            referenceType: notificationData?.Reference_Type || null,
            referenceId: notificationData?.Reference_ID || null,
            createdAt: notificationData?.Created_At,
            isSystemNotification: this.isSystemNotification
        };
    }

    navigateBack(): void {
        this.router.navigate(['/summary/notifications/notifications']);
    }

    sendNotification(): void {
        this.router.navigate(['/summary/notifications/notifications', this.notificationId, 'send']);
    }
}
