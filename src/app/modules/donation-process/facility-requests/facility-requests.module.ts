import { NgModule } from '@angular/core';
import { ConfirmationService, MessageService } from 'primeng/api';
import { SharedModule } from 'src/app/Shared/shared/shared.module';
import { DonationProcessSharedModule } from '../shared/donation-process-shared.module';
import { FacilityRequestDetailsComponent } from './components/facility-request-details/facility-request-details.component';
import { FacilityRequestFormComponent } from './components/facility-request-form/facility-request-form.component';
import { FacilityRequestsListComponent } from './components/facility-requests-list/facility-requests-list.component';
import { FacilityRequestsRoutingModule } from './facility-requests-routing.module';

@NgModule({
  declarations: [
    FacilityRequestsListComponent,
    FacilityRequestFormComponent,
    FacilityRequestDetailsComponent,
  ],
  imports: [FacilityRequestsRoutingModule, SharedModule, DonationProcessSharedModule],
  providers: [MessageService, ConfirmationService],
})
export class FacilityRequestsModule {}
