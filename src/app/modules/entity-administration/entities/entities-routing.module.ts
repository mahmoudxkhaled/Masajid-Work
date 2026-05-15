import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { EntityAdminEntitiesListComponent } from './components/entity-admin-entities-list/entity-admin-entities-list.component';
import { EntityAdminEntityFormComponent } from './components/entity-admin-entity-form/entity-admin-entity-form.component';
import { EntityAdminEntityDetailsComponent } from './components/entity-admin-entity-details/entity-admin-entity-details.component';

const routes: Routes = [
    { path: '', redirectTo: 'list', pathMatch: 'full' },
    { path: 'list', component: EntityAdminEntitiesListComponent, data: { breadcrumb: 'entitiesList', requestedSystemRole: 3 } },
    { path: 'new', component: EntityAdminEntityFormComponent, data: { breadcrumb: 'newEntity', requestedSystemRole: 3 } },
    { path: ':id', component: EntityAdminEntityDetailsComponent, data: { breadcrumb: 'entityDetails', requestedSystemRole: 3 } },
    { path: ':id/edit', component: EntityAdminEntityFormComponent, data: { breadcrumb: 'editEntity', requestedSystemRole: 3 } },
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class EntitiesRoutingModule { }

