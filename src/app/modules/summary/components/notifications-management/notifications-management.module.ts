import { NgModule } from '@angular/core';
import { MessageService } from 'primeng/api';
import { SharedModule } from 'src/app/Shared/shared/shared.module';
import { NotificationsManagementRoutingModule } from './notifications-management-routing.module';

// Main Component
import { NotificationsManagementMainComponent } from './components/notifications-management-main/notifications-management-main.component';

// Types
import { TypesListComponent } from './components/types/types-list/types-list.component';

// Categories
import { SystemCategoriesListComponent } from './components/categories/system-categories-list/system-categories-list.component';
import { EntityCategoriesListComponent } from './components/categories/entity-categories-list/entity-categories-list.component';
import { CategoryFormComponent } from './components/categories/category-form/category-form.component';
import { CategoryDetailsComponent } from './components/categories/category-details/category-details.component';

// Create Notification (kept for reference, can be removed later)
import { CreateNotificationComponent } from './components/create-notification/create-notification.component';

// Send
import { SendNotificationComponent } from './components/send/send-notification.component';
// Notifications List and Form (from notifications module)
import { NotificationsListComponent } from '../notifications/notifications-list/notifications-list.component';
import { SystemNotificationsListComponent } from './components/notifications/system-notifications-list/system-notifications-list.component';
import { EntityNotificationsListComponent } from './components/notifications/entity-notifications-list/entity-notifications-list.component';
import { NotificationFormComponent } from '../notifications/notification-form/notification-form.component';

@NgModule({
    declarations: [
        NotificationsManagementMainComponent,
        TypesListComponent,
        SystemCategoriesListComponent,
        EntityCategoriesListComponent,
        CategoryFormComponent,
        CategoryDetailsComponent,
        CreateNotificationComponent,
        SendNotificationComponent,
        NotificationsListComponent,
        SystemNotificationsListComponent,
        EntityNotificationsListComponent,
        NotificationFormComponent,
    ],
    imports: [
        NotificationsManagementRoutingModule,
        SharedModule,
    ],
    providers: [MessageService]
})
export class NotificationsManagementModule { }
