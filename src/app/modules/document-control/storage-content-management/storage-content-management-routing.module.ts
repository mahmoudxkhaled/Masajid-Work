import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { StorageContentLandingComponent } from './storage-content-landing/storage-content-landing.component';
import { OsfsComponent } from './online-storage-file-systems/osfs/osfs.component';
import { SharedFilesComponent } from './shared-file-systems/shared-files/shared-files.component';
import { DcsComponent } from './document-control-system/dcs/dcs.component';
import { EdmsComponent } from './electronic-document-management-system/edms/edms.component';

const routes: Routes = [
    { path: '', component: StorageContentLandingComponent },
    {
        path: 'osfs/folder/:fileSystemId',
        component: OsfsComponent,
        data: { breadcrumb: 'fileSystemOsfsExplorer' },
    },
    {
        path: 'osfs',
        component: OsfsComponent,
        data: { breadcrumb: 'fileSystemOSFS' },
    },
    { path: 'shared-files', component: SharedFilesComponent, data: { breadcrumb: 'fileSystemSFS' } },
    { path: 'document-control-system', component: DcsComponent, data: { breadcrumb: 'fileSystemDCS' } },
    { path: 'electronic-document-management-system', component: EdmsComponent, data: { breadcrumb: 'fileSystemEDMS' } },
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class StorageContentManagementRoutingModule { }
