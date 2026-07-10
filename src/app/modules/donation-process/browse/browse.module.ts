import { NgModule } from '@angular/core';
import { MessageService } from 'primeng/api';
import { SharedModule } from 'src/app/Shared/shared/shared.module';
import { DonationProcessSharedModule } from '../shared/donation-process-shared.module';
import { BrowseDonationsListComponent } from './components/browse-donations-list/browse-donations-list.component';
import { DonationBrowseFiltersComponent } from './components/donation-browse-filters/donation-browse-filters.component';
import { DonorRequestPublicDetailsComponent } from './components/donor-request-public-details/donor-request-public-details.component';
import { BrowseRoutingModule } from './browse-routing.module';

@NgModule({
  declarations: [
    BrowseDonationsListComponent,
    DonationBrowseFiltersComponent,
    DonorRequestPublicDetailsComponent,
  ],
  imports: [BrowseRoutingModule, SharedModule, DonationProcessSharedModule],
  providers: [MessageService],
})
export class BrowseModule {}
