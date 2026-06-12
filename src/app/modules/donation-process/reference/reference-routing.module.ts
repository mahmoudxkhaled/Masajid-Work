import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DonationCategoriesListComponent } from './components/donation-categories-list/donation-categories-list.component';

const routes: Routes = [
  { path: '', redirectTo: 'categories', pathMatch: 'full' },
  {
    path: 'categories',
    component: DonationCategoriesListComponent,
    data: { breadcrumb: 'donations.reference.categories.title' },
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ReferenceRoutingModule {}
