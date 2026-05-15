import { NgModule } from '@angular/core';
import { MessageService } from 'primeng/api';
import { SharedModule } from 'src/app/Shared/shared/shared.module';
import { NotificationsRoutingModule } from './notifications-routing.module';

// Inbox
import { NotificationsInboxComponent } from './inbox/notifications-inbox.component';

@NgModule({
    declarations: [
        NotificationsInboxComponent,
    ],
    imports: [
        NotificationsRoutingModule,
        SharedModule,
    ],
    providers: [MessageService]
})
export class NotificationsModule { }
