import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { BrowseDonationsListComponent } from './components/browse-donations-list/browse-donations-list.component';

const routes: Routes = [
  { path: '', component: BrowseDonationsListComponent, data: { breadcrumb: 'donations.browse.title' } },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class BrowseRoutingModule {}
