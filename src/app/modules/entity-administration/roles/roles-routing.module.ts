import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

// Components
import { RolesListComponent } from './components/Role/roles-list/roles-list.component';
import { RoleFormComponent } from './components/Role/role-form/role-form.component';
import { RoleDetailsComponent } from './components/Role/role-details/role-details.component';
import { RolePermissionsComponent } from './components/Permissions/role-permissions/role-permissions.component';

const routes: Routes = [
    { path: '', redirectTo: 'list', pathMatch: 'full' },
    { path: 'list', component: RolesListComponent, data: { breadcrumb: 'rolesList' } },
    { path: 'new', component: RoleFormComponent, data: { breadcrumb: 'newRole', requestedSystemRole: 3 } },
    { path: 'permissions/:roleId', component: RolePermissionsComponent, data: { breadcrumb: 'permissions' } },
    { path: ':id', component: RoleDetailsComponent, data: { breadcrumb: 'roleDetails' } },
    { path: ':id/edit', component: RoleFormComponent, data: { breadcrumb: 'editRole', requestedSystemRole: 3 } },
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class RolesRoutingModule { }
