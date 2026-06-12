import { NgModule } from '@angular/core';
import { MessageService } from 'primeng/api';
import { SharedModule } from 'src/app/Shared/shared/shared.module';
import { DonationProcessSharedModule } from '../shared/donation-process-shared.module';
import { BrowseDonationsListComponent } from './components/browse-donations-list/browse-donations-list.component';
import { BrowseRoutingModule } from './browse-routing.module';

@NgModule({
  declarations: [BrowseDonationsListComponent],
  imports: [BrowseRoutingModule, SharedModule, DonationProcessSharedModule],
  providers: [MessageService],
})
export class BrowseModule {}
