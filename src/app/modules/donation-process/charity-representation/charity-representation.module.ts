import { NgModule } from '@angular/core';
import { MessageService } from 'primeng/api';
import { SharedModule } from 'src/app/Shared/shared/shared.module';
import { DonationProcessSharedModule } from '../shared/donation-process-shared.module';
import { CharityRepresentationListComponent } from './components/charity-representation-list/charity-representation-list.component';
import { CharityRepresentationRoutingModule } from './charity-representation-routing.module';

@NgModule({
  declarations: [CharityRepresentationListComponent],
  imports: [CharityRepresentationRoutingModule, SharedModule, DonationProcessSharedModule],
  providers: [MessageService],
})
export class CharityRepresentationModule {}
