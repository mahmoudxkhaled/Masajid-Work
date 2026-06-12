import { NgModule } from '@angular/core';
import { MessageService } from 'primeng/api';
import { SharedModule } from 'src/app/Shared/shared/shared.module';
import { DonationProcessSharedModule } from '../shared/donation-process-shared.module';
import { ValidationListComponent } from './components/validation-list/validation-list.component';
import { ValidationRoutingModule } from './validation-routing.module';

@NgModule({
  declarations: [ValidationListComponent],
  imports: [ValidationRoutingModule, SharedModule, DonationProcessSharedModule],
  providers: [MessageService],
})
export class ValidationModule {}
