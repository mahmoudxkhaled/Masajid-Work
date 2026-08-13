import {
  isCommitmentCancelled,
  isCommitmentCompleted,
} from './donation-commitment-status.model';
import {
  DonationRequestStatusId,
  isDonationRequestClosingStatus,
} from './donation-request-status.model';
import { FulfilledBy, FulfilledByValue } from './fulfilled-by.model';
import { FulfillmentMode } from './fulfillment-mode.model';

export interface DonationFulfillmentBackend {
  Donation_Fulfillment_ID?: number;
  Donation_Commitment_ID?: number;
  Donation_Vendor_Offer_ID?: number | null;
  Fulfilled_By?: number;
  Fulfillment_Note?: string;
  Fulfillment_Note_Regional?: string;
  Submitted_At?: string;
  Facility_Response_User_ID?: number | null;
  Facility_Response_At?: string | null;
  Facility_Response_Note?: string;
  Validation_Opens_At?: string | null;
  Status?: number;
  Rejection_Confirmed_At?: string | null;
  Rejection_Confirmed_By_User_ID?: number | null;
  Rejection_Valid?: boolean | null;
  Donation_Request_ID?: number;
  Donor_User_ID?: number;
}

export interface DonationFulfillmentListItem {
  id: string;
  fulfilledBy: number;
  fulfillmentNote: string;
  donationVendorOfferId: number;
  statusId: number;
  createdAt: string;
}

export interface DonationFulfillmentDetails {
  id: string;
  donationCommitmentId: string;
  donationRequestId: string;
  donorUserId: number;
  fulfilledBy: number;
  fulfillmentNote: string;
  donationVendorOfferId: number;
  statusId: number;
  createdAt: string;
  facilityResponseUserId: number;
  facilityResponseNote: string;
  facilityResponseAt: string;
  validationOpensAt: string;
  rejectionConfirmedAt: string;
  rejectionConfirmedByUserId: number;
  rejectionValid: boolean | null;
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
  proofAttachmentIds: number[];
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

export function canFacilityReviewFulfillment(requestStatusId: number | null | undefined): boolean {
  if (requestStatusId == null || requestStatusId <= 0) {
    return true;
  }

  if (isDonationRequestClosingStatus(requestStatusId)) {
    return false;
  }

  return requestStatusId === DonationRequestStatusId.FulfillmentSubmitted;
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
