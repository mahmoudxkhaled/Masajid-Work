import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EntityStorageManagementRoutingModule } from './entity-storage-management-routing.module';
import { SharedModule } from 'src/app/Shared/shared/shared.module';
import { EntityStorageSharedModule } from './entity-storage-shared.module';
import { EntityStorageManagementComponent } from './entity-storage-management.component';
import { FileSystemsPermissionsComponent } from './file-systems-permissions/file-systems-permissions.component';

/**
 * Entity Storage Management (ESM) Module.
 * Provides full management of Virtual Drives owned by the Entity, File Systems,
 * Synchronization, Entity Storage Settings, and Access Rights for Entity Administrators.
 */
@NgModule({
    declarations: [
        EntityStorageManagementComponent,
        FileSystemsPermissionsComponent
    ],
    imports: [
        CommonModule,
        EntityStorageManagementRoutingModule,
        SharedModule,
        EntityStorageSharedModule
    ]
})
export class EntityStorageManagementModule { }
