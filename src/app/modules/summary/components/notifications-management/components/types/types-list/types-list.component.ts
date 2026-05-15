import { Component, OnInit, OnDestroy } from '@angular/core';
import { MessageService } from 'primeng/api';
import { Observable, Subscription } from 'rxjs';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';
import { IAccountSettings } from 'src/app/core/models/account-status.model';
import { NotificationType, NotificationTypeBackend } from 'src/app/modules/summary/models/notifications.model';
import { NotificationsService } from 'src/app/modules/summary/services/notifications.service';

@Component({
    selector: 'app-types-list',
    templateUrl: './types-list.component.html',
    styleUrls: ['./types-list.component.scss']
})
export class TypesListComponent implements OnInit, OnDestroy {
    types: NotificationType[] = [];
    isLoading$: Observable<boolean>;
    tableLoadingSpinner = false;
    private subscriptions: Subscription[] = [];

    /** When loading and types is empty, return placeholder rows so the table can show skeleton cells. */
    get tableValue(): NotificationType[] {
        if (this.tableLoadingSpinner && this.types.length === 0) {
            return Array(10).fill(null).map(() => ({} as NotificationType));
        }
        return this.types;
    }
    accountSettings: IAccountSettings;
    isRegional: boolean = false;

    constructor(
        private notificationsService: NotificationsService,
        private messageService: MessageService,
        private localStorageService: LocalStorageService
    ) {
        this.isLoading$ = this.notificationsService.isLoadingSubject.asObservable();
        this.accountSettings = this.localStorageService.getAccountSettings() as IAccountSettings;
        this.isRegional = this.accountSettings?.Language !== 'English';
    }

    ngOnInit(): void {
        this.loadTypes();
    }

    ngOnDestroy(): void {
        this.subscriptions.forEach((sub) => sub.unsubscribe());
    }

    loadTypes(): void {
        this.tableLoadingSpinner = true;

        const sub = this.notificationsService.listNotificationTypes().subscribe({
            next: (response: any) => {
                console.log('loadTypes response', response);
                if (!response?.success) {
                    this.handleError(response);
                    return;
                }

                const typesData = response?.message || response?.Notification_Types || [];

                this.types = Array.isArray(typesData) ? typesData.map((item: any) => {
                    const typeBackend = item as NotificationTypeBackend;
                    return {
                        id: typeBackend?.type_ID ?? 0,
                        name: typeBackend?.title || '',
                        nameRegional: typeBackend?.description || '',
                        urgency: typeBackend?.urgeny || '',
                        example: typeBackend?.example || ''
                    };
                }) : [];
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

    private handleError(response: any): void {
        this.resetLoadingFlags();
    }

    private resetLoadingFlags(): void {
        this.tableLoadingSpinner = false;
    }

    getUrgencySeverity(urgency?: string): string {
        if (!urgency) {
            return 'secondary';
        }

        const urgencyLower = urgency.toLowerCase();
        if (urgencyLower.includes('high') || urgencyLower.includes('critical')) {
            return 'danger';
        } else if (urgencyLower.includes('medium')) {
            return 'warning';
        } else if (urgencyLower.includes('low') || urgencyLower.includes('very low')) {
            return 'success';
        } else if (urgencyLower.includes('none')) {
            return 'secondary';
        }

        return 'info';
    }
}
