import {
  DonationCommitmentStatus,
  isCommitmentCancelled,
  isCommitmentCompleted,
} from './donation-commitment-status.model';
import { isDonationRequestClosingStatus } from './donation-request-status.model';

export type BreakdownScreenMode = 'donor' | 'facility' | 'admin';

export interface DonationBreakdownItemBackend {
  Donation_Breakdown_Item_ID?: number;
  Title?: string;
  Title_Regional?: string;
  Description?: string | null;
  Description_Regional?: string | null;
  Quantity?: number;
  Estimated_Cost?: number;
  Currency_Code?: string;
  Is_Donor_Portion?: boolean;
  Resulting_Request_ID?: number | null;
}

export interface DonationBreakdownRequestBackend {
  Donation_Breakdown_Request_ID?: number;
  Commitment_ID?: number;
  Donation_Request_ID?: number;
  Status?: number | string;
  Status_Code?: string;
  Facility_Confirmed_By_User_ID?: number | null;
  Facility_Confirmed_At?: string | null;
  Admin_Applied_By_User_ID?: number | null;
  Admin_Applied_At?: string | null;
  Rejected_By_User_ID?: number | null;
  Rejected_At?: string | null;
  Rejection_Note?: string;
  Items?: DonationBreakdownItemBackend[] | unknown[] | Record<string, DonationBreakdownItemBackend | unknown>;
}

export interface DonationBreakdownItem {
  title: string;
  description: string;
  quantity: number;
  estimatedCost: number;
  currencyCode: string;
  donorPortion: boolean;
}

export interface DonationBreakdownRequestListItem {
  id: string;
  donationBreakdownRequestId: string;
  donationCommitmentId: string;
  statusId: number;
  status: number;
  statusCode: string;
  facilityConfirmedAt: string;
  adminAppliedAt: string;
  rejectedAt: string;
}

export function createEmptyBreakdownRequestListItem(): DonationBreakdownRequestListItem {
  return {
    id: '',
    donationBreakdownRequestId: '',
    donationCommitmentId: '',
    statusId: 0,
    status: 0,
    statusCode: '',
    facilityConfirmedAt: '',
    adminAppliedAt: '',
    rejectedAt: '',
  };
}

export interface DonationBreakdownRequestDetails {
  id: string;
  donationRequestId: string;
  donationCommitmentId: string;
  statusId: number;
  statusCode: string;
  rejectionNote: string;
  items: DonationBreakdownItem[];
}

export interface CreateBreakdownItemInput {
  title: string;
  description: string;
  quantity: number;
  estimatedCost: number;
  currencyCode: string;
  donorPortion: boolean;
}

export interface CreateBreakdownRequestDto {
  donationCommitmentId: number;
  items: CreateBreakdownItemInput[];
  isRegional: boolean;
}

export function canRequestBreakdown(
  commitmentStatusId: number | null | undefined,
  requestStatusId: number | null | undefined,
): boolean {
  const commitmentStatus = Number(commitmentStatusId || 0);
  if (!commitmentStatus) {
    return false;
  }
  if (isCommitmentCompleted(commitmentStatus) || isCommitmentCancelled(commitmentStatus)) {
    return false;
  }
  if (commitmentStatus === DonationCommitmentStatus.Pending) {
    return false;
  }
  if (requestStatusId == null) {
    return true;
  }
  const requestStatus = Number(requestStatusId || 0);
  if (isDonationRequestClosingStatus(requestStatus)) {
    return false;
  }
  return true;
}
