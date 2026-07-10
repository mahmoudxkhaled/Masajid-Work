import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DonorGuard } from 'src/app/core/guards/donor.guard';
import { BrowseDonationsListComponent } from './components/browse-donations-list/browse-donations-list.component';
import { DonorRequestPublicDetailsComponent } from './components/donor-request-public-details/donor-request-public-details.component';

const routes: Routes = [
  {
    path: '',
    component: BrowseDonationsListComponent,
    canActivate: [DonorGuard],
    data: { breadcrumb: 'donations.browse.title' },
  },
  {
    path: ':id',
    component: DonorRequestPublicDetailsComponent,
    canActivate: [DonorGuard],
    data: { breadcrumb: 'donations.browse.details.title' },
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class BrowseRoutingModule {}
