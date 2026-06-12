export interface DonationCommitmentBackend {
  Donation_Commitment_ID?: number;
  Donation_Request_ID?: number;
  Status_ID?: number;
  Donor_User_ID?: number;
  Expected_Closure_At?: string;
  Created_At?: string;
}

export interface DonationCommitmentListItem {
  id: string;
  donationRequestId: string;
  statusId: number;
  expectedClosureAt: string;
  createdAt: string;
}
