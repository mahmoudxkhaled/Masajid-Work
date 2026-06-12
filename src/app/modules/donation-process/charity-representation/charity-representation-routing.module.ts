import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CharityRepresentationListComponent } from './components/charity-representation-list/charity-representation-list.component';

const routes: Routes = [
  { path: '', redirectTo: 'representation', pathMatch: 'full' },
  {
    path: 'representation',
    component: CharityRepresentationListComponent,
    data: { breadcrumb: 'donations.charityRepresentation.title' },
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class CharityRepresentationRoutingModule {}
