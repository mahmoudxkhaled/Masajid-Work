import { NgModule } from '@angular/core';
import { MessageService } from 'primeng/api';
import { SharedModule } from 'src/app/Shared/shared/shared.module';
import { GroupsRoutingModule } from './groups-routing.module';

// Components
import { GroupsListComponent } from './groups-list/groups-list.component';
import { GroupFormComponent } from './group-form/group-form.component';
import { GroupDetailsComponent } from './group-details/group-details.component';
import { GroupMembersComponent } from './group-members/group-members.component';

@NgModule({
    declarations: [
        GroupsListComponent,
        GroupFormComponent,
        GroupDetailsComponent,
        GroupMembersComponent,
    ],
    imports: [
        GroupsRoutingModule,
        SharedModule,
    ],
    providers: [MessageService]
})
export class GroupsModule { }

