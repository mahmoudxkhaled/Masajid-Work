import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SharedModule } from 'src/app/Shared/shared/shared.module';
import { LocationPickerModule } from 'src/app/Shared/components/location-picker/location-picker.module';
import { DonationCategoryPickerComponent } from './donation-category-picker/donation-category-picker.component';
import { DonationLocationMapDialogComponent } from './donation-location-map-dialog/donation-location-map-dialog.component';
import { DonationStatusBadgeComponent } from './donation-status-badge/donation-status-badge.component';
import { DonationWorkflowTimelineComponent } from './donation-workflow-timeline/donation-workflow-timeline.component';

@NgModule({
  declarations: [
    DonationStatusBadgeComponent,
    DonationCategoryPickerComponent,
    DonationWorkflowTimelineComponent,
    DonationLocationMapDialogComponent,
  ],
  imports: [CommonModule, FormsModule, SharedModule, LocationPickerModule],
  exports: [
    DonationStatusBadgeComponent,
    DonationCategoryPickerComponent,
    DonationWorkflowTimelineComponent,
    DonationLocationMapDialogComponent,
    LocationPickerModule,
  ],
})
export class DonationProcessSharedModule { }
