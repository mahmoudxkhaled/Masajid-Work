import { NgModule } from '@angular/core';
import { MessageService } from 'primeng/api';
import { SharedModule } from 'src/app/Shared/shared/shared.module';
import { DonationProcessSharedModule } from '../shared/donation-process-shared.module';
import { VendorOffersListComponent } from './components/vendor-offers-list/vendor-offers-list.component';
import { VendorOffersRoutingModule } from './vendor-offers-routing.module';

@NgModule({
  declarations: [VendorOffersListComponent],
  imports: [VendorOffersRoutingModule, SharedModule, DonationProcessSharedModule],
  providers: [MessageService],
})
export class VendorOffersModule {}
