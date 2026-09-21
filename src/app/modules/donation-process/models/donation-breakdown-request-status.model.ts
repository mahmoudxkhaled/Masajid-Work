export const DonationBreakdownRequestStatus = {
  Pending: 1,
  Confirmed: 2,
  Rejected: 3,
  Applied: 4,
} as const;

export type DonationBreakdownRequestStatusValue =
  (typeof DonationBreakdownRequestStatus)[keyof typeof DonationBreakdownRequestStatus];

export type BreakdownStatusSeverity = 'success' | 'info' | 'warning' | 'danger' | 'secondary' | 'contrast';

export function resolveBreakdownStatusId(
  statusId: number | string | null | undefined,
  statusCode?: string,
): number {
  if (typeof statusId === 'number' && statusId > 0) {
    return statusId;
  }
  if (typeof statusId === 'string') {
    const trimmed = statusId.trim();
    if (/^\d+$/.test(trimmed)) {
      return Number(trimmed);
    }
  }

  const code = String(statusCode || (typeof statusId === 'string' ? statusId : '') || '')
    .trim()
    .toUpperCase();
  switch (code) {
    case 'PENDING':
    case 'PENDING_REVIEW':
    case 'PENDING_FACILITY_REVIEW':
      return DonationBreakdownRequestStatus.Pending;
    case 'CONFIRMED':
    case 'FACILITY_CONFIRMED':
      return DonationBreakdownRequestStatus.Confirmed;
    case 'APPLIED':
      return DonationBreakdownRequestStatus.Applied;
    case 'REJECTED':
      return DonationBreakdownRequestStatus.Rejected;
    default:
      return 0;
  }
}

export function getBreakdownStatusLabelKey(
  statusId: number | string | null | undefined,
  statusCode?: string,
): string {
  switch (resolveBreakdownStatusId(statusId, statusCode)) {
    case DonationBreakdownRequestStatus.Pending:
      return 'donations.breakdown.status.pending';
    case DonationBreakdownRequestStatus.Confirmed:
      return 'donations.breakdown.status.confirmed';
    case DonationBreakdownRequestStatus.Applied:
      return 'donations.breakdown.status.applied';
    case DonationBreakdownRequestStatus.Rejected:
      return 'donations.breakdown.status.rejected';
    default:
      return 'donations.breakdown.status.unknown';
  }
}

export function getBreakdownStatusSeverity(
  statusId: number | string | null | undefined,
  statusCode?: string,
): BreakdownStatusSeverity {
  switch (resolveBreakdownStatusId(statusId, statusCode)) {
    case DonationBreakdownRequestStatus.Pending:
      return 'warning';
    case DonationBreakdownRequestStatus.Confirmed:
      return 'info';
    case DonationBreakdownRequestStatus.Applied:
      return 'success';
    case DonationBreakdownRequestStatus.Rejected:
      return 'danger';
    default:
      return 'secondary';
  }
}

export function isBreakdownPending(statusId: number | string | null | undefined, statusCode?: string): boolean {
  return resolveBreakdownStatusId(statusId, statusCode) === DonationBreakdownRequestStatus.Pending;
}

export function isBreakdownConfirmed(statusId: number | string | null | undefined, statusCode?: string): boolean {
  return resolveBreakdownStatusId(statusId, statusCode) === DonationBreakdownRequestStatus.Confirmed;
}

export function isBreakdownApplied(statusId: number | string | null | undefined, statusCode?: string): boolean {
  return resolveBreakdownStatusId(statusId, statusCode) === DonationBreakdownRequestStatus.Applied;
}

export function isBreakdownRejected(statusId: number | string | null | undefined, statusCode?: string): boolean {
  return resolveBreakdownStatusId(statusId, statusCode) === DonationBreakdownRequestStatus.Rejected;
}

export function isBreakdownFinal(statusId: number | string | null | undefined, statusCode?: string): boolean {
  const status = resolveBreakdownStatusId(statusId, statusCode);
  return (
    status === DonationBreakdownRequestStatus.Applied ||
    status === DonationBreakdownRequestStatus.Rejected
  );
}

export function getBreakdownStatusFilterOptions(): { value: number | null; labelKey: string }[] {
  return [
    { value: null, labelKey: 'donations.breakdown.filters.allStatuses' },
    { value: DonationBreakdownRequestStatus.Pending, labelKey: 'donations.breakdown.status.pending' },
    { value: DonationBreakdownRequestStatus.Confirmed, labelKey: 'donations.breakdown.status.confirmed' },
    { value: DonationBreakdownRequestStatus.Rejected, labelKey: 'donations.breakdown.status.rejected' },
    { value: DonationBreakdownRequestStatus.Applied, labelKey: 'donations.breakdown.status.applied' },
  ];
}
