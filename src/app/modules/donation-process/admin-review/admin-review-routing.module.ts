import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PendingReviewListComponent } from './components/pending-review-list/pending-review-list.component';

const routes: Routes = [
  { path: '', redirectTo: 'pending-review', pathMatch: 'full' },
  {
    path: 'pending-review',
    component: PendingReviewListComponent,
    data: { breadcrumb: 'donations.adminReview.title' },
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AdminReviewRoutingModule {}
