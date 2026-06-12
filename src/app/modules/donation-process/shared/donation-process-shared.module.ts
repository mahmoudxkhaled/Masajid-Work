import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SharedModule } from 'src/app/Shared/shared/shared.module';
import { DonationCategoryPickerComponent } from './donation-category-picker/donation-category-picker.component';
import { DonationStatusBadgeComponent } from './donation-status-badge/donation-status-badge.component';

@NgModule({
  declarations: [DonationStatusBadgeComponent, DonationCategoryPickerComponent],
  imports: [CommonModule, FormsModule, SharedModule],
  exports: [DonationStatusBadgeComponent, DonationCategoryPickerComponent],
})
export class DonationProcessSharedModule {}
