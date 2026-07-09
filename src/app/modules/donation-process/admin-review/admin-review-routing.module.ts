import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SystemAdminGuard } from 'src/app/core/guards/system-admin.guard';
import { PendingReviewDetailsComponent } from './components/pending-review-details/pending-review-details.component';
import { PendingReviewListComponent } from './components/pending-review-list/pending-review-list.component';

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
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AdminReviewRoutingModule {}
