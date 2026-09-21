import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DonorGuard } from 'src/app/core/guards/donor.guard';
import { MyCommitmentsListComponent } from './components/my-commitments-list/my-commitments-list.component';
import { DonorCommitmentDetailsComponent } from './components/donor-commitment-details/donor-commitment-details.component';
import { SubmitFulfillmentProofComponent } from './components/submit-fulfillment-proof/submit-fulfillment-proof.component';
import { CreateBreakdownRequestComponent } from './components/create-breakdown-request/create-breakdown-request.component';
import { BreakdownRequestDetailsComponent } from '../shared/breakdown/breakdown-request-details/breakdown-request-details.component';

const routes: Routes = [
  {
    path: '',
    component: MyCommitmentsListComponent,
    canActivate: [DonorGuard],
    data: { breadcrumb: 'donations.commitments.title' },
  },
  {
    path: ':id/submit-proof',
    component: SubmitFulfillmentProofComponent,
    canActivate: [DonorGuard],
    data: { breadcrumb: 'donations.commitments.submitProofDialog.title' },
  },
  {
    path: ':id/request-breakdown',
    component: CreateBreakdownRequestComponent,
    canActivate: [DonorGuard],
    data: { breadcrumb: 'donations.breakdown.createDialog.title' },
  },
  {
    path: ':id/breakdown/:breakdownRequestId',
    component: BreakdownRequestDetailsComponent,
    canActivate: [DonorGuard],
    data: { breadcrumb: 'donations.breakdown.details.title', mode: 'donor' },
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
