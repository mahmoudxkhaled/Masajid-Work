import { NgModule } from '@angular/core';
import { MessageService } from 'primeng/api';
import { SharedModule } from 'src/app/Shared/shared/shared.module';
import { DonationProcessSharedModule } from '../shared/donation-process-shared.module';
import { DonationCategoriesListComponent } from './components/donation-categories-list/donation-categories-list.component';
import { ReferenceRoutingModule } from './reference-routing.module';

@NgModule({
  declarations: [DonationCategoriesListComponent],
  imports: [ReferenceRoutingModule, SharedModule, DonationProcessSharedModule],
  providers: [MessageService],
})
export class ReferenceModule {}
