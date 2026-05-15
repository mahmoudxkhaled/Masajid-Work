import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { SharedModule } from 'src/app/Shared/shared/shared.module';
import { FolderManagementComponent } from './components/folder-management.component';
import { FolderService } from './services/folder.service';

/**
 * Folder Management Module for managing folders within a File System.
 * Provides folder tree navigation, CRUD operations, and folder contents display.
 */
@NgModule({
  declarations: [
    FolderManagementComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    SharedModule
  ],
  exports: [
    FolderManagementComponent
  ],
  providers: [
    FolderService
  ]
})
export class FolderManagementModule { }
