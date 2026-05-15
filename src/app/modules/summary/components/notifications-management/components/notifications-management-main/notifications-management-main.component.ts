import { Component, OnInit } from '@angular/core';
import { NotificationsService } from 'src/app/modules/summary/services/notifications.service';
import { PermissionService } from 'src/app/core/services/permission.service';

@Component({
    selector: 'app-notifications-management-main',
    templateUrl: './notifications-management-main.component.html',
    styleUrls: ['./notifications-management-main.component.scss']
})
export class NotificationsManagementMainComponent implements OnInit {
    activeTabIndex: number = 0;
    notificationMode: 'system' | 'entity' = 'system';
    isSystemAdmin: boolean = false;
    isEntityAdmin: boolean = false;

    constructor(
        private notificationsService: NotificationsService,
        private permissionService: PermissionService
    ) {
        this.isSystemAdmin = this.notificationsService.isSystemAdmin();
        this.isEntityAdmin = this.notificationsService.isEntityAdmin();
        
        // Set default mode based on user permissions
        if (this.canSwitchToSystem()) {
            this.notificationMode = 'system'; // System Admin defaults to System
        } else if (this.canSwitchToEntity()) {
            this.notificationMode = 'entity'; // Entity Admin defaults to Entity
        }
    }

    ngOnInit(): void {
        // Start with Types tab (index 0)
        this.activeTabIndex = 0;
    }

    onModeChange(): void {
        // Reset to first tab when mode changes
        this.activeTabIndex = 0;
    }

    canSwitchToSystem(): boolean {
        // Check actual permissions for System notifications and categories
        return this.permissionService.canListNotificationCategories() || 
               this.permissionService.canListNotifications();
    }

    canSwitchToEntity(): boolean {
        // Check actual permissions for Entity notifications and categories
        return this.permissionService.canListEntityNotificationCategories() || 
               this.permissionService.canListEntityNotifications() ||
               this.isEntityAdmin;
    }
}
