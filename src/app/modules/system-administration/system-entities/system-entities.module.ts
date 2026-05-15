import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MessageService } from 'primeng/api';

import { SystemEntitiesRoutingModule } from './system-entities-routing.module';
import { SharedEntitiesModule } from 'src/app/modules/shared/entities/shared-entities.module';
import { SystemEntitiesListComponent } from './components/system-entities-list/system-entities-list.component';
import { SystemEntityDetailsComponent } from './components/system-entity-details/system-entity-details.component';
import { SystemEntityFormComponent } from './components/system-entity-form/system-entity-form.component';

@NgModule({
    declarations: [
        SystemEntitiesListComponent,
        SystemEntityDetailsComponent,
        SystemEntityFormComponent
    ],
    imports: [
        CommonModule,
        SystemEntitiesRoutingModule,
        SharedEntitiesModule
    ],
    providers: [MessageService]
})
export class SystemEntitiesModule { }

