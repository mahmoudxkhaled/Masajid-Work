import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { VendorGuard } from 'src/app/core/guards/vendor.guard';
import { CreateVendorOfferDialogComponent } from './components/create-vendor-offer-dialog/create-vendor-offer-dialog.component';
import { VendorOfferDetailsComponent } from './components/vendor-offer-details/vendor-offer-details.component';
import { VendorOfferFormComponent } from './components/vendor-offer-form/vendor-offer-form.component';
import { VendorOffersListComponent } from './components/vendor-offers-list/vendor-offers-list.component';
import { VendorRequestDetailsComponent } from './components/vendor-request-details/vendor-request-details.component';
import { VendorRequestsListComponent } from './components/vendor-requests-list/vendor-requests-list.component';
import { WithdrawVendorOfferDialogComponent } from './components/withdraw-vendor-offer-dialog/withdraw-vendor-offer-dialog.component';

const routes: Routes = [
  { path: '', redirectTo: 'requests', pathMatch: 'full' },
  {
    path: 'requests',
    component: VendorRequestsListComponent,
    canActivate: [VendorGuard],
    data: { breadcrumb: 'donations.vendorOffers.requests.title' },
  },
  {
    path: 'requests/:requestId',
    component: VendorRequestDetailsComponent,
    canActivate: [VendorGuard],
    data: { breadcrumb: 'donations.vendorOffers.requestDetails.title' },
  },
  {
    path: 'offers',
    component: VendorOffersListComponent,
    canActivate: [VendorGuard],
    data: { breadcrumb: 'donations.vendorOffers.myOffers.title' },
  },
  {
    path: 'offers/:offerId',
    component: VendorOfferDetailsComponent,
    canActivate: [VendorGuard],
    data: { breadcrumb: 'donations.vendorOffers.offerDetails.title' },
  },
  {
    path: 'offers/:offerId/edit',
    component: VendorOfferFormComponent,
    canActivate: [VendorGuard],
    data: { breadcrumb: 'donations.vendorOffers.form.editTitle' },
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class VendorOffersRoutingModule { }
