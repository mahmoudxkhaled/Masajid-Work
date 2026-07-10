import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DonorGuard } from 'src/app/core/guards/donor.guard';
import { MyCommitmentsListComponent } from './components/my-commitments-list/my-commitments-list.component';
import { DonorCommitmentDetailsComponent } from './components/donor-commitment-details/donor-commitment-details.component';

const routes: Routes = [
  {
    path: '',
    component: MyCommitmentsListComponent,
    canActivate: [DonorGuard],
    data: { breadcrumb: 'donations.commitments.title' },
  },
  {
    path: ':id',
    component: DonorCommitmentDetailsComponent,
    canActivate: [DonorGuard],
    data: { breadcrumb: 'donations.commitments.details.title' },
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class CommitmentsRoutingModule { }
