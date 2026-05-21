import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PublicLayoutComponent } from './layout/public-layout.component';
import { LandingPageComponent } from './pages/landing-page/landing-page.component';
import { RegisterSelectionComponent } from './pages/register-selection/register-selection.component';
import { DonorRegistrationComponent } from './pages/register-donor/register-donor.component';
import { FacilityRegistrationComponent } from './pages/register-facility/register-facility.component';
import { VendorRegistrationComponent } from './pages/register-vendor/register-vendor.component';
import { CharityCenterRegistrationComponent } from './pages/register-charity-center/register-charity-center.component';

const routes: Routes = [
  {
    path: '',
    component: PublicLayoutComponent,
    children: [
      { path: '', component: LandingPageComponent },
      { path: 'register', component: RegisterSelectionComponent },
      { path: 'register/donor', component: DonorRegistrationComponent },
      { path: 'register/facility', component: FacilityRegistrationComponent },
      { path: 'register/vendor', component: VendorRegistrationComponent },
      { path: 'register/charity-center', component: CharityCenterRegistrationComponent },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PublicRoutingModule {}
