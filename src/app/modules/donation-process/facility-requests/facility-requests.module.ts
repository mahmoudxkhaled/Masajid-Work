import { NgModule } from '@angular/core';
import { MessageService } from 'primeng/api';
import { SharedModule } from 'src/app/Shared/shared/shared.module';
import { DonationProcessSharedModule } from '../shared/donation-process-shared.module';
import { FacilityRequestsListComponent } from './components/facility-requests-list/facility-requests-list.component';
import { FacilityRequestsRoutingModule } from './facility-requests-routing.module';

@NgModule({
  declarations: [FacilityRequestsListComponent],
  imports: [FacilityRequestsRoutingModule, SharedModule, DonationProcessSharedModule],
  providers: [MessageService],
})
export class FacilityRequestsModule {}
