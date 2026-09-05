export interface DonationRequestStatusBackend {
  Donation_Request_Status_ID?: number;
  Code?: string;
  Name?: string;
  Name_Regional?: string;
  Is_Terminal?: boolean;
  Sort_Order?: number;
}

export interface DonationRequestStatus {
  id: number;
  code: string;
  name: string;
}

export const DonationRequestStatusId = {
  Draft: 1,
  PendingReview: 2,
  Rejected: 3,
  Published: 4,
  Accepted: 5,
  InFulfillment: 6,
  BrokenDown: 7,
  FulfillmentSubmitted: 8,
  FacilityConfirmed: 9,
  OpenForValidation: 10,
  Validated: 11,
  Closed: 12,
  Cancelled: 13,
} as const;

export type DonationRequestStatusIdValue =
  (typeof DonationRequestStatusId)[keyof typeof DonationRequestStatusId];

export function getDonationRequestStatusLabelKey(statusId: number): string {
  switch (statusId) {
    case DonationRequestStatusId.Draft:
      return 'donations.requestStatus.draft';
    case DonationRequestStatusId.PendingReview:
      return 'donations.requestStatus.pendingReview';
    case DonationRequestStatusId.Rejected:
      return 'donations.requestStatus.rejected';
    case DonationRequestStatusId.Published:
      return 'donations.requestStatus.published';
    case DonationRequestStatusId.Accepted:
      return 'donations.requestStatus.accepted';
    case DonationRequestStatusId.InFulfillment:
      return 'donations.requestStatus.inFulfillment';
    case DonationRequestStatusId.BrokenDown:
      return 'donations.requestStatus.brokenDown';
    case DonationRequestStatusId.FulfillmentSubmitted:
      return 'donations.requestStatus.fulfillmentSubmitted';
    case DonationRequestStatusId.FacilityConfirmed:
      return 'donations.requestStatus.facilityConfirmed';
    case DonationRequestStatusId.OpenForValidation:
      return 'donations.requestStatus.openForValidation';
    case DonationRequestStatusId.Validated:
      return 'donations.requestStatus.validated';
    case DonationRequestStatusId.Closed:
      return 'donations.requestStatus.closed';
    case DonationRequestStatusId.Cancelled:
      return 'donations.requestStatus.cancelled';
    default:
      return 'donations.requestStatus.unknown';
  }
}

export function isDonationRequestClosingStatus(statusId: number): boolean {
  return (
    statusId === DonationRequestStatusId.Rejected ||
    statusId === DonationRequestStatusId.BrokenDown ||
    statusId === DonationRequestStatusId.Closed ||
    statusId === DonationRequestStatusId.Cancelled
  );
}

export function isDonationRequestPublished(statusId: number): boolean {
  return statusId === DonationRequestStatusId.Published;
}

export function isDonationRequestDraft(statusId: number): boolean {
  return statusId === DonationRequestStatusId.Draft;
}

export function canCloseDonationRequest(statusId: number | null | undefined): boolean {
  return statusId === DonationRequestStatusId.Validated;
}
