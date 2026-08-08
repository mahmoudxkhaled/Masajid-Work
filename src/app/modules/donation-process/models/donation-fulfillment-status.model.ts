export const FulfillmentStatusId = {
  Submitted: 1,
  Confirmed: 2,
  Rejected: 3,
} as const;

export type FulfillmentStatusIdValue =
  (typeof FulfillmentStatusId)[keyof typeof FulfillmentStatusId];

export type FulfillmentStatusSeverity =
  | 'success'
  | 'info'
  | 'warning'
  | 'danger'
  | 'secondary'
  | 'contrast';

export function getFulfillmentStatusLabelKey(statusId: number): string {
  switch (statusId) {
    case FulfillmentStatusId.Submitted:
      return 'donations.fulfillmentStatus.submitted';
    case FulfillmentStatusId.Confirmed:
      return 'donations.fulfillmentStatus.confirmed';
    case FulfillmentStatusId.Rejected:
      return 'donations.fulfillmentStatus.rejected';
    default:
      return 'donations.fulfillmentStatus.unknown';
  }
}

export function getFulfillmentStatusSeverity(statusId: number): FulfillmentStatusSeverity {
  switch (statusId) {
    case FulfillmentStatusId.Submitted:
      return 'info';
    case FulfillmentStatusId.Confirmed:
      return 'success';
    case FulfillmentStatusId.Rejected:
      return 'danger';
    default:
      return 'secondary';
  }
}

export function isFulfillmentSubmitted(statusId: number): boolean {
  return statusId === FulfillmentStatusId.Submitted;
}

export function isFulfillmentConfirmed(statusId: number): boolean {
  return statusId === FulfillmentStatusId.Confirmed;
}

export function isFulfillmentRejected(statusId: number): boolean {
  return statusId === FulfillmentStatusId.Rejected;
}
