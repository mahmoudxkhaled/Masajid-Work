import {
  isCommitmentCancelled,
  isCommitmentCompleted,
} from './donation-commitment-status.model';
import { isDonationRequestClosingStatus } from './donation-request-status.model';
import { FulfilledBy, FulfilledByValue } from './fulfilled-by.model';
import { FulfillmentMode } from './fulfillment-mode.model';

export interface DonationFulfillmentBackend {
  Donation_Fulfillment_ID?: number;
  Donation_Commitment_ID?: number;
  Donation_Request_ID?: number;
  Fulfilled_By?: number;
  Donation_Vendor_Offer_ID?: number;
  Fulfillment_Note?: string;
  Fulfillment_Note_Regional?: string;
  Status?: number;
  Status_Code?: string;
  Created_At?: string;
  Submitted_At?: string;
  Updated_At?: string;
  Attachment_File_IDs?: number[] | Record<string, number>;
  Attachments?: Record<string, unknown>[] | Record<string, Record<string, unknown>>;
  Files?: Record<string, unknown>[] | Record<string, Record<string, unknown>>;
  File_System_ID?: number;
  Folder_ID?: number;
}

export interface DonationFulfillmentListItem {
  id: string;
  fulfilledBy: number;
  fulfillmentNote: string;
  donationVendorOfferId: number;
  statusId: number;
  statusCode: string;
  createdAt: string;
}

export interface DonationFulfillmentDetails {
  id: string;
  donationCommitmentId: string;
  donationRequestId: string;
  fulfilledBy: number;
  fulfillmentNote: string;
  donationVendorOfferId: number;
  statusId: number;
  statusCode: string;
  createdAt: string;
  fileSystemId: number;
  folderId: number;
  attachmentFileIds: number[];
  proofFiles: DonationFulfillmentProofFile[];
}

export interface DonationFulfillmentProofFile {
  fileId: number;
  fileName: string;
  fileType: string;
}

export interface SubmitFulfillmentProofRequest {
  donationCommitmentId: number;
  fulfilledBy: number;
  donationVendorOfferId: number;
  fulfillmentNote: string;
  isRegional: boolean;
  attachmentFileIds: number[];
  fileSystemId: number;
  folderId: number;
}

export function canSubmitFulfillmentProof(
  commitmentStatusId: number,
  requestStatusId: number | null | undefined,
): boolean {
  if (isCommitmentCompleted(commitmentStatusId) || isCommitmentCancelled(commitmentStatusId)) {
    return false;
  }

  if (requestStatusId != null && requestStatusId > 0 && isDonationRequestClosingStatus(requestStatusId)) {
    return false;
  }

  return true;
}

export function resolveDefaultFulfilledBy(
  selectedVendorOfferId: number,
  fulfillmentMode: number,
): FulfilledByValue {
  if (selectedVendorOfferId > 0) {
    return FulfilledBy.Vendor;
  }
  if (fulfillmentMode === FulfillmentMode.ViaCharityRepresentative) {
    return FulfilledBy.CharityCenter;
  }
  return FulfilledBy.Donor;
}
