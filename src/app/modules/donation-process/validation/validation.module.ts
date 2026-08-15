import { NgModule } from '@angular/core';
import { MessageService } from 'primeng/api';
import { SharedModule } from 'src/app/Shared/shared/shared.module';
import { DonationProcessSharedModule } from '../shared/donation-process-shared.module';
import { RequestValidationsListComponent } from './components/request-validations-list/request-validations-list.component';
import { SubmitDonationValidationDialogComponent } from './components/submit-donation-validation-dialog/submit-donation-validation-dialog.component';
import { ValidationDetailsComponent } from './components/validation-details/validation-details.component';
import { ValidationListComponent } from './components/validation-list/validation-list.component';
import { ValidationRequestDetailsComponent } from './components/validation-request-details/validation-request-details.component';
import { ValidationRoutingModule } from './validation-routing.module';

@NgModule({
  declarations: [
    ValidationListComponent,
    ValidationRequestDetailsComponent,
    RequestValidationsListComponent,
    ValidationDetailsComponent,
    SubmitDonationValidationDialogComponent,
  ],
  imports: [ValidationRoutingModule, SharedModule, DonationProcessSharedModule],
  providers: [MessageService],
})
export class ValidationModule {}
