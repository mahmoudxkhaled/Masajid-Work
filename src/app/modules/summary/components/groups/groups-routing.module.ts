import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

// Components
import { GroupsListComponent } from './groups-list/groups-list.component';
import { GroupFormComponent } from './group-form/group-form.component';
import { GroupDetailsComponent } from './group-details/group-details.component';

const routes: Routes = [
    { path: '', redirectTo: 'list', pathMatch: 'full' },
    { path: 'list', component: GroupsListComponent, data: { breadcrumb: 'groups' } },
    { path: 'new', component: GroupFormComponent, data: { breadcrumb: 'newGroup' } },
    { path: ':id', component: GroupDetailsComponent, data: { breadcrumb: 'groupDetails' } },
    { path: ':id/edit', component: GroupFormComponent, data: { breadcrumb: 'editGroup' } },
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class GroupsRoutingModule { }

