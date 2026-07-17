import { NgModule } from '@angular/core';
import { MessageService } from 'primeng/api';
import { SharedModule } from 'src/app/Shared/shared/shared.module';
import { DonationProcessSharedModule } from '../shared/donation-process-shared.module';
import { CreateVendorOfferDialogComponent } from './components/create-vendor-offer-dialog/create-vendor-offer-dialog.component';
import { VendorOfferDetailsComponent } from './components/vendor-offer-details/vendor-offer-details.component';
import { VendorOfferFormComponent } from './components/vendor-offer-form/vendor-offer-form.component';
import { VendorOffersListComponent } from './components/vendor-offers-list/vendor-offers-list.component';
import { VendorRequestDetailsComponent } from './components/vendor-request-details/vendor-request-details.component';
import { VendorRequestsListComponent } from './components/vendor-requests-list/vendor-requests-list.component';
import { WithdrawVendorOfferDialogComponent } from './components/withdraw-vendor-offer-dialog/withdraw-vendor-offer-dialog.component';
import { VendorOffersRoutingModule } from './vendor-offers-routing.module';

@NgModule({
  declarations: [
    VendorRequestsListComponent,
    VendorRequestDetailsComponent,
    CreateVendorOfferDialogComponent,
    VendorOffersListComponent,
    VendorOfferDetailsComponent,
    VendorOfferFormComponent,
    WithdrawVendorOfferDialogComponent,
  ],
  imports: [VendorOffersRoutingModule, SharedModule, DonationProcessSharedModule],
  providers: [MessageService],
})
export class VendorOffersModule { }
