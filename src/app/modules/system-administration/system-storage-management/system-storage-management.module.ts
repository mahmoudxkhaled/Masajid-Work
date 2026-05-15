import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SystemStorageManagementRoutingModule } from './system-storage-management-routing.module';
import { SharedModule } from 'src/app/Shared/shared/shared.module';
import { SystemStorageManagementComponent } from './system-storage-management.component';
import { VirtualDrivesSectionComponent } from './virtual-drives-section/virtual-drives-section.component';

/**
 * System Storage Management (SSM) Module.
 * Provides full management of Virtual Drives, monitoring, and File Systems management
 * for Developers and System Administrators.
 */
@NgModule({
    declarations: [
        SystemStorageManagementComponent,
        VirtualDrivesSectionComponent
    ],
    imports: [
        CommonModule,
        FormsModule,
        SystemStorageManagementRoutingModule,
        SharedModule
    ]
})
export class SystemStorageManagementModule { }
