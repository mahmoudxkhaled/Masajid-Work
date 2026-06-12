import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { VendorOffersListComponent } from './components/vendor-offers-list/vendor-offers-list.component';

const routes: Routes = [
  { path: '', redirectTo: 'requests', pathMatch: 'full' },
  {
    path: 'requests',
    component: VendorOffersListComponent,
    data: { breadcrumb: 'donations.vendorOffers.title' },
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class VendorOffersRoutingModule {}
