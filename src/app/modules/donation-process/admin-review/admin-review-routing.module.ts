import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SystemAdminGuard } from 'src/app/core/guards/system-admin.guard';
import { PendingReviewDetailsComponent } from './components/pending-review-details/pending-review-details.component';
import { PendingReviewListComponent } from './components/pending-review-list/pending-review-list.component';
import { ReadyToCloseDetailsComponent } from './components/ready-to-close-details/ready-to-close-details.component';
import { ReadyToCloseListComponent } from './components/ready-to-close-list/ready-to-close-list.component';
import { BreakdownReviewListComponent } from './components/breakdown-review-list/breakdown-review-list.component';
import { BreakdownRequestDetailsComponent } from '../shared/breakdown/breakdown-request-details/breakdown-request-details.component';
import { BreakdownRequestsListComponent } from '../shared/breakdown/breakdown-requests-list/breakdown-requests-list.component';

const routes: Routes = [
  { path: '', redirectTo: 'pending-review', pathMatch: 'full' },
  {
    path: 'pending-review',
    component: PendingReviewListComponent,
    canActivate: [SystemAdminGuard],
    data: { breadcrumb: 'donations.adminReview.title' },
  },
  {
    path: 'pending-review/:id',
    component: PendingReviewDetailsComponent,
    canActivate: [SystemAdminGuard],
    data: { breadcrumb: 'donations.adminReview.details.title' },
  },
  {
    path: 'ready-to-close',
    component: ReadyToCloseListComponent,
    canActivate: [SystemAdminGuard],
    data: { breadcrumb: 'donations.adminClose.title' },
  },
  {
    path: 'ready-to-close/:requestId',
    component: ReadyToCloseDetailsComponent,
    canActivate: [SystemAdminGuard],
    data: { breadcrumb: 'donations.adminClose.details.title' },
  },
  {
    path: 'breakdown-review',
    component: BreakdownReviewListComponent,
    canActivate: [SystemAdminGuard],
    data: { breadcrumb: 'donations.adminBreakdownReview.title' },
  },
  {
    path: 'breakdown-review/:breakdownRequestId',
    component: BreakdownRequestDetailsComponent,
    canActivate: [SystemAdminGuard],
    data: { breadcrumb: 'donations.breakdown.details.title', mode: 'admin', fromQueue: true },
  },
  {
    path: 'requests/:requestId/breakdown/:breakdownRequestId',
    component: BreakdownRequestDetailsComponent,
    canActivate: [SystemAdminGuard],
    data: { breadcrumb: 'donations.breakdown.details.title', mode: 'admin' },
  },
  {
    path: 'requests/:requestId/breakdown',
    component: BreakdownRequestsListComponent,
    canActivate: [SystemAdminGuard],
    data: { breadcrumb: 'donations.breakdown.list.title', mode: 'admin' },
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AdminReviewRoutingModule {}
