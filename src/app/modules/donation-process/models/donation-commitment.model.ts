import { FulfillmentModeValue } from './fulfillment-mode.model';

export interface DonationCommitmentBackend {
  Donation_Commitment_ID?: number;
  Donation_Request_ID?: number;
  Status_ID?: number;
  Status?: number;
  Donor_User_ID?: number;
  Is_Anonymous?: boolean;
  Fulfillment_Mode?: number;
  Charity_Entity_ID?: number | null;
  Charity_Rep_User_ID?: number | null;
  Expected_Closure_At?: string;
  Accepted_At?: string;
  Cancelled_At?: string | null;
  Cancelled_By_User_ID?: number | null;
  Cancel_Reason?: string;
  Completed_At?: string | null;
  Created_At?: string;
  Updated_At?: string;
  Title?: string;
  Title_Regional?: string;
  Request_Title?: string;
  Request_Title_Regional?: string;
  Entity_ID?: number;
  Description?: string;
  Description_Regional?: string;
  City?: string;
  Country_Code?: string;
  Quantity?: number;
  Unit?: string;
  Estimated_Cost?: number;
  Currency_Code?: string;
}

export interface DonationCommitmentListItem {
  id: string;
  donationRequestId: string;
  entityId: number;
  statusId: number;
  title: string;
  fulfillmentMode: number;
  isAnonymous: boolean;
  expectedClosureAt: string;
  acceptedAt: string;
}

export interface DonationCommitmentDetails {
  id: string;
  donationRequestId: string;
  statusId: number;
  statusCode: string;
  donorUserId: number;
  entityId: number;
  isAnonymous: boolean;
  fulfillmentMode: FulfillmentModeValue | number;
  charityEntityId: number;
  charityRepUserId: number;
  expectedClosureAt: string;
  acceptedAt: string;
  cancelledAt: string;
  cancelledByUserId: number;
  cancelReason: string;
  completedAt: string;
  title: string;
}

export interface AcceptDonationRequest {
  donationRequestId: number;
  isAnonymous: boolean;
  fulfillmentMode: number;
  charityEntityId: number;
  expectedClosureAt: string;
}

export interface SetFulfillmentModeRequest {
  donationCommitmentId: number;
  fulfillmentMode: number;
  charityEntityId: number;
}
