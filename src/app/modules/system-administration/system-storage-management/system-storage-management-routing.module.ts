import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SystemStorageManagementComponent } from './system-storage-management.component';

const routes: Routes = [
    {
        path: '',
        component: SystemStorageManagementComponent,
        data: { breadcrumb: 'fileSystemSSM' }
    }
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class SystemStorageManagementRoutingModule { }
