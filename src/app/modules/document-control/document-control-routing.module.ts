import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { FileSystemLandingComponent } from './storage-content-management/file-system-landing/file-system-landing.component';

const routes: Routes = [
    { path: '', component: FileSystemLandingComponent, data: { breadcrumb: 'fileSystem' } },
    {
        path: 'storage-content-management',
        data: { breadcrumb: 'fileSystemStorageContent' },
        loadChildren: () => import('./storage-content-management/storage-content-management.module').then((m) => m.StorageContentManagementModule)
    }
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class DocumentControlRoutingModule { }
