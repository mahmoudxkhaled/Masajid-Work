import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SharedModule } from 'src/app/Shared/shared/shared.module';
import { LocationPickerModule } from 'src/app/Shared/components/location-picker/location-picker.module';
import { DonationCategoryPickerComponent } from './donation-category-picker/donation-category-picker.component';
import { DonationLocationMapDialogComponent } from './donation-location-map-dialog/donation-location-map-dialog.component';
import { DonationStatusBadgeComponent } from './donation-status-badge/donation-status-badge.component';
import { DonationWorkflowTimelineComponent } from './donation-workflow-timeline/donation-workflow-timeline.component';
import { DonationAttachmentListComponent } from './donation-attachment-list/donation-attachment-list.component';
import { DonationAttachmentUploaderComponent } from './donation-attachment-uploader/donation-attachment-uploader.component';
import { DonationAttachmentPendingPickerComponent } from './donation-attachment-pending-picker/donation-attachment-pending-picker.component';
import { ApplyBreakdownDialogComponent } from './breakdown/apply-breakdown-dialog/apply-breakdown-dialog.component';
import { BreakdownItemsListComponent } from './breakdown/breakdown-items-list/breakdown-items-list.component';
import { BreakdownRequestDetailsComponent } from './breakdown/breakdown-request-details/breakdown-request-details.component';
import { BreakdownRequestsListComponent } from './breakdown/breakdown-requests-list/breakdown-requests-list.component';
import { BreakdownRequestsSectionComponent } from './breakdown/breakdown-requests-section/breakdown-requests-section.component';
import { ConfirmBreakdownDialogComponent } from './breakdown/confirm-breakdown-dialog/confirm-breakdown-dialog.component';
import { RejectBreakdownDialogComponent } from './breakdown/reject-breakdown-dialog/reject-breakdown-dialog.component';

@NgModule({
  declarations: [
    DonationStatusBadgeComponent,
    DonationCategoryPickerComponent,
    DonationWorkflowTimelineComponent,
    DonationLocationMapDialogComponent,
    DonationAttachmentListComponent,
    DonationAttachmentUploaderComponent,
    DonationAttachmentPendingPickerComponent,
    ApplyBreakdownDialogComponent,
    BreakdownItemsListComponent,
    BreakdownRequestDetailsComponent,
    BreakdownRequestsListComponent,
    BreakdownRequestsSectionComponent,
    ConfirmBreakdownDialogComponent,
    RejectBreakdownDialogComponent,
  ],
  imports: [CommonModule, FormsModule, SharedModule, LocationPickerModule],
  exports: [
    DonationStatusBadgeComponent,
    DonationCategoryPickerComponent,
    DonationWorkflowTimelineComponent,
    DonationLocationMapDialogComponent,
    DonationAttachmentListComponent,
    DonationAttachmentUploaderComponent,
    DonationAttachmentPendingPickerComponent,
    ApplyBreakdownDialogComponent,
    BreakdownItemsListComponent,
    BreakdownRequestDetailsComponent,
    BreakdownRequestsListComponent,
    BreakdownRequestsSectionComponent,
    ConfirmBreakdownDialogComponent,
    RejectBreakdownDialogComponent,
    LocationPickerModule,
  ],
})
export class DonationProcessSharedModule { }
