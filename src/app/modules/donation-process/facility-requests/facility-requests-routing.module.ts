import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { FacilityRepresentativeGuard } from 'src/app/core/guards/facility-representative.guard';
import { ConfirmFulfillmentDialogComponent } from './components/confirm-fulfillment-dialog/confirm-fulfillment-dialog.component';
import { FacilityFulfillmentReviewComponent } from './components/facility-fulfillment-review/facility-fulfillment-review.component';
import { FacilityFulfillmentsListComponent } from './components/facility-fulfillments-list/facility-fulfillments-list.component';
import { FacilityRequestDetailsComponent } from './components/facility-request-details/facility-request-details.component';
import { FacilityRequestFormComponent } from './components/facility-request-form/facility-request-form.component';
import { FacilityRequestFulfillmentsComponent } from './components/facility-request-fulfillments/facility-request-fulfillments.component';
import { FacilityRequestsListComponent } from './components/facility-requests-list/facility-requests-list.component';
import { RejectFulfillmentDialogComponent } from './components/reject-fulfillment-dialog/reject-fulfillment-dialog.component';

const routes: Routes = [
  { path: '', redirectTo: 'requests', pathMatch: 'full' },
  {
    path: 'requests',
    component: FacilityRequestsListComponent,
    canActivate: [FacilityRepresentativeGuard],
    data: { breadcrumb: 'donations.facility.requests.title' },
  },
  {
    path: 'requests/create',
    component: FacilityRequestFormComponent,
    canActivate: [FacilityRepresentativeGuard],
    data: { breadcrumb: 'donations.facility.requests.form.createTitle' },
  },
  {
    path: 'requests/:id',
    component: FacilityRequestDetailsComponent,
    canActivate: [FacilityRepresentativeGuard],
    data: { breadcrumb: 'donations.facility.requests.details.title' },
  },
  {
    path: 'requests/:id/edit',
    component: FacilityRequestFormComponent,
    canActivate: [FacilityRepresentativeGuard],
    data: { breadcrumb: 'donations.facility.requests.form.editTitle' },
  },
  {
    path: 'fulfillments',
    component: FacilityFulfillmentsListComponent,
    canActivate: [FacilityRepresentativeGuard],
    data: { breadcrumb: 'facilityFulfillments' },
  },
  {
    path: 'fulfillments/:requestId',
    component: FacilityRequestFulfillmentsComponent,
    canActivate: [FacilityRepresentativeGuard],
    data: { breadcrumb: 'facilityFulfillmentsRequest' },
  },
  {
    path: 'fulfillments/:requestId/:fulfillmentId',
    component: FacilityFulfillmentReviewComponent,
    canActivate: [FacilityRepresentativeGuard],
    data: { breadcrumb: 'facilityFulfillmentsReview' },
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class FacilityRequestsRoutingModule {}
