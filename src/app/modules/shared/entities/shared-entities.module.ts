import { NgModule } from '@angular/core';
import { SharedModule } from 'src/app/Shared/shared/shared.module';
import { RolesModule } from 'src/app/modules/entity-administration/roles/roles.module';
import { EntityAccountsModule } from 'src/app/modules/entity-administration/entity-accounts/entity-accounts.module';
import { EntityGroupsModule } from 'src/app/modules/entity-administration/entity-groups/entity-groups.module';
import { SharedUserAccountsModule } from 'src/app/modules/shared/user-accounts/shared-user-accounts.module';
import { SharedEntitiesListComponent } from 'src/app/modules/shared/entities/components/shared-entities-list/shared-entities-list.component';
import { SharedEntityDetailsComponent } from 'src/app/modules/shared/entities/components/shared-entity-details/shared-entity-details.component';
import { SharedEntityFormComponent } from 'src/app/modules/shared/entities/components/shared-entity-form/shared-entity-form.component';
import { SharedEntityContactComponent } from 'src/app/modules/shared/entities/components/shared-entity-contact/shared-entity-contact.component';

@NgModule({
    declarations: [
        SharedEntitiesListComponent,
        SharedEntityDetailsComponent,
        SharedEntityFormComponent,
        SharedEntityContactComponent
    ],
    imports: [
        SharedModule,
        RolesModule,
        EntityAccountsModule,
        EntityGroupsModule,
        SharedUserAccountsModule
    ],
    exports: [
        SharedEntitiesListComponent,
        SharedEntityDetailsComponent,
        SharedEntityFormComponent,
        SharedEntityContactComponent
    ]
})
export class SharedEntitiesModule { }

