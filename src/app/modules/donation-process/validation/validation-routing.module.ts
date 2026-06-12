import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ValidationListComponent } from './components/validation-list/validation-list.component';

const routes: Routes = [
  { path: '', component: ValidationListComponent, data: { breadcrumb: 'donations.validation.title' } },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ValidationRoutingModule {}
