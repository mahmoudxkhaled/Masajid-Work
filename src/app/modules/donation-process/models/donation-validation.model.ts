import {
  DonationRequestStatusId,
  isDonationRequestClosingStatus,
} from './donation-request-status.model';

export interface DonationValidationBackend {
  Donation_Validation_ID?: number;
  Donation_Request_ID?: number;
  Donation_Fulfillment_ID?: number;
  Validator_User_ID?: number;
  Validator_Name?: string;
  Validator_Name_Regional?: string;
  Validation_Result?: number;
  Notes?: string;
  Notes_Regional?: string;
  Validated_At?: string;
  Submitted_At?: string;
  Created_At?: string;
  Status?: number;
}

export interface DonationValidationListItem {
  id: string;
  donationFulfillmentId: number;
  validatorUserId: number;
  validationResult: number;
  notes: string;
  validatedAt: string;
}

export interface DonationValidationDetails {
  id: string;
  donationRequestId: string;
  donationFulfillmentId: number;
  validatorUserId: number;
  validatorName: string;
  validationResult: number;
  notes: string;
  submittedAt: string;
  statusId: number;
}

export interface SubmitDonationValidationRequest {
  donationFulfillmentId: number;
  validationResult: number;
  notes: string;
  isRegional: boolean;
  validationAttachmentIds: number[];
  fileSystemId: number;
  folderId: number;
}

export function canSubmitDonationValidation(statusId: number | null | undefined): boolean {
  if (statusId == null || statusId <= 0) {
    return true;
  }

  if (isDonationRequestClosingStatus(statusId)) {
    return false;
  }

  if (statusId === DonationRequestStatusId.Validated) {
    return false;
  }

  return statusId === DonationRequestStatusId.OpenForValidation;
}
