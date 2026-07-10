import { NgModule } from '@angular/core';
import { MessageService } from 'primeng/api';
import { SharedModule } from 'src/app/Shared/shared/shared.module';
import { DonationProcessSharedModule } from '../shared/donation-process-shared.module';
import { MyCommitmentsListComponent } from './components/my-commitments-list/my-commitments-list.component';
import { DonorCommitmentDetailsComponent } from './components/donor-commitment-details/donor-commitment-details.component';
import { CancelCommitmentDialogComponent } from './components/cancel-commitment-dialog/cancel-commitment-dialog.component';
import { CommitmentsRoutingModule } from './commitments-routing.module';

@NgModule({
  declarations: [
    MyCommitmentsListComponent,
    DonorCommitmentDetailsComponent,
    CancelCommitmentDialogComponent,
  ],
  imports: [CommitmentsRoutingModule, SharedModule, DonationProcessSharedModule],
  providers: [MessageService],
})
export class CommitmentsModule { }
