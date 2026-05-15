import { NgModule } from '@angular/core';
import { MessageService } from 'primeng/api';
import { SharedModule } from 'src/app/Shared/shared/shared.module';
import { EntityGroupsRoutingModule } from './entity-groups-routing.module';

// Components
import { EntityGroupsListComponent } from './components/entity-groups-list/entity-groups-list.component';
import { EntityGroupFormComponent } from './components/entity-group-form/entity-group-form.component';
import { EntityGroupDetailsComponent } from './components/entity-group-details/entity-group-details.component';
import { EntityGroupMembersComponent } from './components/entity-group-members/entity-group-members.component';

@NgModule({
    declarations: [
        EntityGroupsListComponent,
        EntityGroupFormComponent,
        EntityGroupDetailsComponent,
        EntityGroupMembersComponent,
    ],
    imports: [
        EntityGroupsRoutingModule,
        SharedModule,
    ],
    exports: [
        EntityGroupsListComponent, // Export to use in other modules
    ],
    providers: [MessageService]
})
export class EntityGroupsModule { }
