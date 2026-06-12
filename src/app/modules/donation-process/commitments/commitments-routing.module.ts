import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MyCommitmentsListComponent } from './components/my-commitments-list/my-commitments-list.component';

const routes: Routes = [
  { path: '', component: MyCommitmentsListComponent, data: { breadcrumb: 'donations.commitments.title' } },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class CommitmentsRoutingModule {}
