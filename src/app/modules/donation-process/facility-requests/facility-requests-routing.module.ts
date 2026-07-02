import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { FacilityRepresentativeGuard } from 'src/app/core/guards/facility-representative.guard';
import { FacilityRequestDetailsComponent } from './components/facility-request-details/facility-request-details.component';
import { FacilityRequestFormComponent } from './components/facility-request-form/facility-request-form.component';
import { FacilityRequestsListComponent } from './components/facility-requests-list/facility-requests-list.component';

const routes: Routes = [
  { path: '', redirectTo: 'requests', pathMatch: 'full' },
  {
    path: 'requests',
    component: FacilityRequestsListComponent,
    canActivate: [FacilityRepresentativeGuard],
    data: { breadcrumb: 'donations.facility.requests.title' },
  },
  {
    path: 'requests/create',
    component: FacilityRequestFormComponent,
    canActivate: [FacilityRepresentativeGuard],
    data: { breadcrumb: 'donations.facility.requests.form.createTitle' },
  },
  {
    path: 'requests/:id',
    component: FacilityRequestDetailsComponent,
    canActivate: [FacilityRepresentativeGuard],
    data: { breadcrumb: 'donations.facility.requests.details.title' },
  },
  {
    path: 'requests/:id/edit',
    component: FacilityRequestFormComponent,
    canActivate: [FacilityRepresentativeGuard],
    data: { breadcrumb: 'donations.facility.requests.form.editTitle' },
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class FacilityRequestsRoutingModule {}
