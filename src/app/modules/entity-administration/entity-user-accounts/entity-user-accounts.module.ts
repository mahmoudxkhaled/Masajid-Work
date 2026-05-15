import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MessageService } from 'primeng/api';
import { SharedUserAccountsModule } from '../../shared/user-accounts/shared-user-accounts.module';
import { EntityUserAccountsRoutingModule } from './entity-user-accounts-routing.module';
import { EntityUserAccountsPageComponent } from './components/entity-user-accounts-page/entity-user-accounts-page.component';
import { EntityUserAccountsListComponent } from './components/entity-user-accounts-list/entity-user-accounts-list.component';

@NgModule({
    declarations: [
        EntityUserAccountsPageComponent,
        EntityUserAccountsListComponent
    ],
    imports: [
        CommonModule,
        SharedUserAccountsModule,
        EntityUserAccountsRoutingModule
    ],
    providers: [MessageService]
})
export class EntityUserAccountsModule { }
