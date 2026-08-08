import { NgModule } from '@angular/core';
import { ConfirmationService, MessageService } from 'primeng/api';
import { SharedModule } from 'src/app/Shared/shared/shared.module';
import { DonationProcessSharedModule } from '../shared/donation-process-shared.module';
import { ConfirmFulfillmentDialogComponent } from './components/confirm-fulfillment-dialog/confirm-fulfillment-dialog.component';
import { FacilityFulfillmentReviewComponent } from './components/facility-fulfillment-review/facility-fulfillment-review.component';
import { FacilityFulfillmentsListComponent } from './components/facility-fulfillments-list/facility-fulfillments-list.component';
import { FacilityRequestDetailsComponent } from './components/facility-request-details/facility-request-details.component';
import { FacilityRequestFormComponent } from './components/facility-request-form/facility-request-form.component';
import { FacilityRequestFulfillmentsComponent } from './components/facility-request-fulfillments/facility-request-fulfillments.component';
import { FacilityRequestsListComponent } from './components/facility-requests-list/facility-requests-list.component';
import { RejectFulfillmentDialogComponent } from './components/reject-fulfillment-dialog/reject-fulfillment-dialog.component';
import { FacilityRequestsRoutingModule } from './facility-requests-routing.module';

@NgModule({
  declarations: [
    FacilityRequestsListComponent,
    FacilityRequestFormComponent,
    FacilityRequestDetailsComponent,
    FacilityFulfillmentsListComponent,
    FacilityRequestFulfillmentsComponent,
    FacilityFulfillmentReviewComponent,
    ConfirmFulfillmentDialogComponent,
    RejectFulfillmentDialogComponent,
  ],
  imports: [FacilityRequestsRoutingModule, SharedModule, DonationProcessSharedModule],
  providers: [MessageService, ConfirmationService],
})
export class FacilityRequestsModule {}
