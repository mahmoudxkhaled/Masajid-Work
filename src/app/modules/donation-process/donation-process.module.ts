import { NgModule } from '@angular/core';
import { SharedModule } from 'src/app/Shared/shared/shared.module';
import { DonationProcessRoutingModule } from './donation-process-routing.module';

@NgModule({
  imports: [DonationProcessRoutingModule, SharedModule],
})
export class DonationProcessModule {}
