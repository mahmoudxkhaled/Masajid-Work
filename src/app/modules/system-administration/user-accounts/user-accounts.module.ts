import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MessageService } from 'primeng/api';
import { SystemUserAccountsRoutingModule } from './user-accounts-routing.module';
import { SharedUserAccountsModule } from '../../shared/user-accounts/shared-user-accounts.module';
import { SystemUserAccountsPageComponent } from './components/system-user-accounts-page/system-user-accounts-page.component';
import { SystemUserAccountsListComponent } from './components/system-user-accounts-list/system-user-accounts-list.component';

@NgModule({
    declarations: [
        SystemUserAccountsPageComponent,
        SystemUserAccountsListComponent
    ],
    imports: [
        CommonModule,
        SystemUserAccountsRoutingModule,
        SharedUserAccountsModule
    ],
    providers: [MessageService]
})
export class SystemUserAccountsModule { }
