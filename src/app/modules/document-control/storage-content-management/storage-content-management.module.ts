import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { BreadcrumbModule } from 'primeng/breadcrumb';
import { SharedModule } from 'src/app/Shared/shared/shared.module';
import { StorageContentManagementRoutingModule } from './storage-content-management-routing.module';
import { StorageContentLandingComponent } from './storage-content-landing/storage-content-landing.component';
import { OsfsComponent } from './online-storage-file-systems/osfs/osfs.component';
import { SharedFilesComponent } from './shared-file-systems/shared-files/shared-files.component';
import { DcsComponent } from './document-control-system/dcs/dcs.component';
import { EdmsComponent } from './electronic-document-management-system/edms/edms.component';
import { FolderManagementModule } from './online-storage-file-systems/folder-management/folder-management.module';

@NgModule({
    declarations: [
        StorageContentLandingComponent,
        OsfsComponent,
        SharedFilesComponent,
        DcsComponent,
        EdmsComponent
    ],
    imports: [
        CommonModule,
        RouterModule,
        BreadcrumbModule,
        SharedModule,
        StorageContentManagementRoutingModule,
        FolderManagementModule
    ],
})
export class StorageContentManagementModule { }
