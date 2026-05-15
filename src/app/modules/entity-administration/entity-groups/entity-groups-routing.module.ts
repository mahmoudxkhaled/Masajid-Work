import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

// Components
import { EntityGroupsListComponent } from './components/entity-groups-list/entity-groups-list.component';
import { EntityGroupFormComponent } from './components/entity-group-form/entity-group-form.component';
import { EntityGroupDetailsComponent } from './components/entity-group-details/entity-group-details.component';

const routes: Routes = [
    { path: '', redirectTo: 'list', pathMatch: 'full' },
    { path: 'list', component: EntityGroupsListComponent, data: { breadcrumb: 'entityGroups' } },
    { path: 'new', component: EntityGroupFormComponent, data: { breadcrumb: 'newEntityGroup' } },
    { path: ':id', component: EntityGroupDetailsComponent, data: { breadcrumb: 'entityGroupDetails' } },
    { path: ':id/edit', component: EntityGroupFormComponent, data: { breadcrumb: 'editEntityGroup' } },
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class EntityGroupsRoutingModule { }
