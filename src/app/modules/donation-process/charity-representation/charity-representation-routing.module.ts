import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CharityCenterRepresentativeGuard } from 'src/app/core/guards/charity-center-representative.guard';
import { CharityRepresentationListComponent } from './components/charity-representation-list/charity-representation-list.component';
import { CharityRepresentationDetailsComponent } from './components/charity-representation-details/charity-representation-details.component';

const routes: Routes = [
  { path: '', redirectTo: 'representation', pathMatch: 'full' },
  {
    path: 'representation',
    component: CharityRepresentationListComponent,
    canActivate: [CharityCenterRepresentativeGuard],
    data: { breadcrumb: 'donations.charityRepresentation.title' },
  },
  {
    path: 'representation/:commitmentId',
    component: CharityRepresentationDetailsComponent,
    canActivate: [CharityCenterRepresentativeGuard],
    data: { breadcrumb: 'donations.charityRepresentation.details.title' },
  },
  {
    path: 'commitments',
    component: CharityRepresentationListComponent,
    canActivate: [CharityCenterRepresentativeGuard],
    data: { breadcrumb: 'donations.charityRepresentation.assigned.title', mode: 'assigned' },
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class CharityRepresentationRoutingModule {}
