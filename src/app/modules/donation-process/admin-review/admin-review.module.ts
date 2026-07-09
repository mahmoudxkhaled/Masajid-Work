import { NgModule } from '@angular/core';
import { MessageService } from 'primeng/api';
import { SharedModule } from 'src/app/Shared/shared/shared.module';
import { DonationProcessSharedModule } from '../shared/donation-process-shared.module';
import { PendingReviewDetailsComponent } from './components/pending-review-details/pending-review-details.component';
import { PendingReviewListComponent } from './components/pending-review-list/pending-review-list.component';
import { AdminReviewRoutingModule } from './admin-review-routing.module';

@NgModule({
  declarations: [PendingReviewListComponent, PendingReviewDetailsComponent],
  imports: [AdminReviewRoutingModule, SharedModule, DonationProcessSharedModule],
  providers: [MessageService],
})
export class AdminReviewModule { }
