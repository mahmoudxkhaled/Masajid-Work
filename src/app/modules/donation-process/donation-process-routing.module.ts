import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  { path: '', redirectTo: 'facility', pathMatch: 'full' },
  {
    path: 'facility',
    loadChildren: () =>
      import('./facility-requests/facility-requests.module').then((m) => m.FacilityRequestsModule),
    data: { breadcrumb: 'donations.facility.title' },
  },
  {
    path: 'browse',
    loadChildren: () => import('./browse/browse.module').then((m) => m.BrowseModule),
    data: { breadcrumb: 'donations.browse.title' },
  },
  {
    path: 'commitments',
    loadChildren: () => import('./commitments/commitments.module').then((m) => m.CommitmentsModule),
    data: { breadcrumb: 'donations.commitments.title' },
  },
  {
    path: 'admin',
    loadChildren: () => import('./admin-review/admin-review.module').then((m) => m.AdminReviewModule),
    data: { breadcrumb: 'donations.adminReview.title' },
  },
  {
    path: 'vendor',
    loadChildren: () => import('./vendor-offers/vendor-offers.module').then((m) => m.VendorOffersModule),
    data: { breadcrumb: 'donations.vendorOffers.title' },
  },
  {
    path: 'charity',
    loadChildren: () =>
      import('./charity-representation/charity-representation.module').then((m) => m.CharityRepresentationModule),
    data: { breadcrumb: 'donations.charityRepresentation.title' },
  },
  {
    path: 'validation',
    loadChildren: () => import('./validation/validation.module').then((m) => m.ValidationModule),
    data: { breadcrumb: 'donations.validation.title' },
  },
  {
    path: 'reference',
    loadChildren: () => import('./reference/reference.module').then((m) => m.ReferenceModule),
    data: { breadcrumb: 'donations.reference.title' },
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class DonationProcessRoutingModule {}
