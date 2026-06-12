import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { FacilityRequestsListComponent } from './components/facility-requests-list/facility-requests-list.component';

const routes: Routes = [
  { path: '', redirectTo: 'requests', pathMatch: 'full' },
  {
    path: 'requests',
    component: FacilityRequestsListComponent,
    data: { breadcrumb: 'donations.facility.requests.title' },
  },
  { path: 'requests/new', redirectTo: '/under-development' },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class FacilityRequestsRoutingModule {}
