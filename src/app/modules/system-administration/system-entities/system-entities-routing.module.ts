import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { SystemEntitiesListComponent } from './components/system-entities-list/system-entities-list.component';
import { SystemEntityFormComponent } from './components/system-entity-form/system-entity-form.component';
import { SystemEntityDetailsComponent } from './components/system-entity-details/system-entity-details.component';

const routes: Routes = [
    { path: '', redirectTo: 'list', pathMatch: 'full' },
    {
        path: 'list',
        component: SystemEntitiesListComponent,
        data: { breadcrumb: 'entitiesList', requestedSystemRole: 2 }
    },
    {
        path: 'new',
        component: SystemEntityFormComponent,
        data: { breadcrumb: 'newEntity', requestedSystemRole: 2 }
    },
    {
        path: ':id',
        component: SystemEntityDetailsComponent,
        data: { breadcrumb: 'entityDetails', requestedSystemRole: 2 }
    },
    {
        path: ':id/edit',
        component: SystemEntityFormComponent,
        data: { breadcrumb: 'editEntity', requestedSystemRole: 2 }
    },
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class SystemEntitiesRoutingModule { }

