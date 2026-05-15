import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { FolderManagementComponent } from './components/folder-management.component';

const routes: Routes = [
  {
    path: ':fileSystemId',
    component: FolderManagementComponent,
    data: { breadcrumb: 'folderManagement' }
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class FolderManagementRoutingModule { }
