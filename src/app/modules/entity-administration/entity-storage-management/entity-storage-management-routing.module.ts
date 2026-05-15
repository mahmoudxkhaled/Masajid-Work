import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { EntityStorageManagementComponent } from './entity-storage-management.component';
import { FileSystemsPermissionsComponent } from './file-systems-permissions/file-systems-permissions.component';

const routes: Routes = [
    {
        path: '',
        component: EntityStorageManagementComponent,
        data: { breadcrumb: 'fileSystemESM' }
    },
    {
        path: 'file-systems/permissions',
        component: FileSystemsPermissionsComponent,
        data: { breadcrumb: 'fileSystem.entityAdmin.permissionsAdmin.title' }
    },
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class EntityStorageManagementRoutingModule { }
