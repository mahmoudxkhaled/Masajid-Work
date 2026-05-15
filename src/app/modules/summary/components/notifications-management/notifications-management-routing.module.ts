import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

// Components
import { NotificationsManagementMainComponent } from './components/notifications-management-main/notifications-management-main.component';
import { SendNotificationComponent } from './components/send/send-notification.component';

const routes: Routes = [
    { path: '', component: NotificationsManagementMainComponent, data: { breadcrumb: 'notificationsManagement' } },
    { path: 'send', component: SendNotificationComponent, data: { breadcrumb: 'sendNotification' } },
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class NotificationsManagementRoutingModule { }
