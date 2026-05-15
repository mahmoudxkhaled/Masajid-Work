import { NgModule } from '@angular/core';
import { MessageService } from 'primeng/api';
import { EntitiesRoutingModule } from './entities-routing.module';
import { SharedEntitiesModule } from 'src/app/modules/shared/entities/shared-entities.module';
import { EntityAdminEntitiesListComponent } from './components/entity-admin-entities-list/entity-admin-entities-list.component';
import { EntityAdminEntityDetailsComponent } from './components/entity-admin-entity-details/entity-admin-entity-details.component';
import { EntityAdminEntityFormComponent } from './components/entity-admin-entity-form/entity-admin-entity-form.component';

@NgModule({
    declarations: [
        EntityAdminEntitiesListComponent,
        EntityAdminEntityDetailsComponent,
        EntityAdminEntityFormComponent
    ],
    imports: [
        EntitiesRoutingModule,
        SharedEntitiesModule
    ],
    providers: [MessageService],
})
export class EntitiesModule { }

