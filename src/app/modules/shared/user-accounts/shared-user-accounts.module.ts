import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { SharedModule } from 'src/app/Shared/shared/shared.module';
import { SharedAccountListComponent } from './components/shared-account-list/shared-account-list.component';
import { SharedAccountDetailsComponent } from './components/shared-account-details/shared-account-details.component';
import { SharedAccountUpdateComponent } from './components/shared-account-update/shared-account-update.component';
import { EntityAccountListComponent } from 'src/app/modules/entity-administration/entity-accounts/components/entity-account-list/entity-account-list.component';
import { EntityAccountDetailsComponent } from 'src/app/modules/entity-administration/entity-accounts/components/entity-account-details/entity-account-details.component';
import { EntityAccountUpdateComponent } from 'src/app/modules/entity-administration/entity-accounts/components/entity-account-update/entity-account-update.component';

@NgModule({
    declarations: [
        SharedAccountListComponent,
        SharedAccountDetailsComponent,
        SharedAccountUpdateComponent,
        EntityAccountListComponent,
        EntityAccountDetailsComponent,
        EntityAccountUpdateComponent
    ],
    imports: [
        SharedModule,
        ReactiveFormsModule
    ],
    exports: [
        SharedAccountListComponent,
        SharedAccountDetailsComponent,
        SharedAccountUpdateComponent,
        EntityAccountListComponent,
        EntityAccountDetailsComponent,
        EntityAccountUpdateComponent
    ]
})
export class SharedUserAccountsModule { }
