import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { WorkflowsComponent } from './workflows/workflows.component';

const routes: Routes = [
    { path: '', redirectTo: 'entities/list', pathMatch: 'full' },
    {
        path: 'entities',
        loadChildren: () => import('../entity-administration/entities/entities.module').then((m) => m.EntitiesModule),
        data: { breadcrumb: 'companyDetails' }
    },
    {
        path: 'roles',
        loadChildren: () => import('../entity-administration/roles/roles.module').then((m) => m.RolesModule),
        data: { breadcrumb: 'roles&Permissions' }
    },
    {
        path: 'entity-user-accounts',
        loadChildren: () => import('../entity-administration/entity-user-accounts/entity-user-accounts.module').then((m) => m.EntityUserAccountsModule),
        data: { breadcrumb: 'entityUserAccounts' }
    },
    {
        path: 'entity-groups',
        loadChildren: () => import('../entity-administration/entity-groups/entity-groups.module').then((m) => m.EntityGroupsModule),
        data: { breadcrumb: 'entityGroups' }
    },
    {
        path: 'entity-storage-management',
        loadChildren: () => import('../entity-administration/entity-storage-management/entity-storage-management.module').then((m) => m.EntityStorageManagementModule),
        data: { breadcrumb: 'fileSystemESM' }
    },
    { path: 'workflows', component: WorkflowsComponent, data: { breadcrumb: 'workflows' } }
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class EntityAdministrationRoutingModule { }
