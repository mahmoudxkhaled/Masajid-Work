import { NgModule } from '@angular/core';
import { MessageService } from 'primeng/api';
import { SharedModule } from 'src/app/Shared/shared/shared.module';
import { ReactiveFormsModule } from '@angular/forms';
import { EntityAccountsRoutingModule } from './entity-accounts-routing.module';
import { SharedUserAccountsModule } from '../../shared/user-accounts/shared-user-accounts.module';

// Components
import { EntityAccountAdminListComponent } from './components/entity-account-admin-list/entity-account-admin-list.component';

@NgModule({
    declarations: [
        EntityAccountAdminListComponent
    ],
    imports: [
        EntityAccountsRoutingModule,
        SharedModule,
        ReactiveFormsModule,
        SharedUserAccountsModule
    ],
    exports: [
        // Export components so they can be used in entities module
        EntityAccountAdminListComponent,
        SharedUserAccountsModule
    ],
    providers: [MessageService]
})
export class EntityAccountsModule { }
