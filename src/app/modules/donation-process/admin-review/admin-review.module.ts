import { NgModule } from '@angular/core';
import { MessageService } from 'primeng/api';
import { SharedModule } from 'src/app/Shared/shared/shared.module';
import { DonationProcessSharedModule } from '../shared/donation-process-shared.module';
import { AdminReviewRoutingModule } from './admin-review-routing.module';
import { CloseDonationRequestDialogComponent } from './components/close-donation-request-dialog/close-donation-request-dialog.component';
import { PendingReviewDetailsComponent } from './components/pending-review-details/pending-review-details.component';
import { PendingReviewListComponent } from './components/pending-review-list/pending-review-list.component';
import { ReadyToCloseDetailsComponent } from './components/ready-to-close-details/ready-to-close-details.component';
import { ReadyToCloseListComponent } from './components/ready-to-close-list/ready-to-close-list.component';

@NgModule({
  declarations: [
    PendingReviewListComponent,
    PendingReviewDetailsComponent,
    ReadyToCloseListComponent,
    ReadyToCloseDetailsComponent,
    CloseDonationRequestDialogComponent,
  ],
  imports: [AdminReviewRoutingModule, SharedModule, DonationProcessSharedModule],
  providers: [MessageService],
})
export class AdminReviewModule {}
