import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

// Components
import { NotificationsInboxComponent } from './inbox/notifications-inbox.component';

const routes: Routes = [
    { path: '', redirectTo: 'inbox', pathMatch: 'full' },
    { path: 'inbox', component: NotificationsInboxComponent, data: { breadcrumb: 'inbox' } },
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class NotificationsRoutingModule { }
