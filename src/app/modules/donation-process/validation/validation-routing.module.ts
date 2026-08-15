import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RequestValidationsListComponent } from './components/request-validations-list/request-validations-list.component';
import { ValidationDetailsComponent } from './components/validation-details/validation-details.component';
import { ValidationListComponent } from './components/validation-list/validation-list.component';
import { ValidationRequestDetailsComponent } from './components/validation-request-details/validation-request-details.component';

const routes: Routes = [
  { path: '', component: ValidationListComponent, data: { breadcrumb: 'communityValidation' } },
  {
    path: ':requestId',
    component: ValidationRequestDetailsComponent,
    data: { breadcrumb: 'communityValidationRequest' },
  },
  {
    path: ':requestId/validations',
    component: RequestValidationsListComponent,
    data: { breadcrumb: 'communityValidationList' },
  },
  {
    path: ':requestId/validations/:validationId',
    component: ValidationDetailsComponent,
    data: { breadcrumb: 'communityValidationDetails' },
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ValidationRoutingModule {}
