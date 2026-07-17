export const DonationCommitmentStatus = {
  InitialActive: 1,
  AcceptedConfirmed: 2,
  UnknownReserved: 3,
  CancelledRejected: 4,
} as const;

export type DonationCommitmentStatusValue =
  (typeof DonationCommitmentStatus)[keyof typeof DonationCommitmentStatus];

export type CommitmentStatusSeverity = 'success' | 'info' | 'warning' | 'danger' | 'secondary' | 'contrast';

export function getCommitmentStatusLabelKey(status: number): string {
  switch (status) {
    case DonationCommitmentStatus.InitialActive:
      return 'donations.commitments.status.active';
    case DonationCommitmentStatus.AcceptedConfirmed:
      return 'donations.commitments.status.accepted';
    case DonationCommitmentStatus.UnknownReserved:
      // TODO: backend has not clearly assigned status 3 yet — display safely until confirmed
      return 'donations.commitments.status.underReview';
    case DonationCommitmentStatus.CancelledRejected:
      return 'donations.commitments.status.cancelledRejected';
    default:
      return 'donations.commitments.status.unknown';
  }
}

export function getCommitmentStatusSeverity(status: number): CommitmentStatusSeverity {
  switch (status) {
    case DonationCommitmentStatus.InitialActive:
      return 'info';
    case DonationCommitmentStatus.AcceptedConfirmed:
      return 'success';
    case DonationCommitmentStatus.UnknownReserved:
      // TODO: backend has not clearly assigned status 3 yet
      return 'warning';
    case DonationCommitmentStatus.CancelledRejected:
      return 'danger';
    default:
      return 'secondary';
  }
}

export function isCommitmentPendingOrActive(status: number): boolean {
  return status === DonationCommitmentStatus.InitialActive;
}

export function isCommitmentAccepted(status: number): boolean {
  return status === DonationCommitmentStatus.AcceptedConfirmed;
}

export function isCommitmentFinal(status: number): boolean {
  return status === DonationCommitmentStatus.CancelledRejected;
}

export function isCommitmentCancelledOrRejected(status: number): boolean {
  return status === DonationCommitmentStatus.CancelledRejected;
}

export function canCancelCommitment(status: number): boolean {
  return (
    status === DonationCommitmentStatus.InitialActive ||
    status === DonationCommitmentStatus.AcceptedConfirmed
  );
}

export function canRespondToRepresentation(status: number): boolean {
  return status === DonationCommitmentStatus.InitialActive;
}

export function getCommitmentStatusFilterOptions(): { value: number; labelKey: string }[] {
  return [
    { value: DonationCommitmentStatus.InitialActive, labelKey: 'donations.commitments.status.active' },
    { value: DonationCommitmentStatus.AcceptedConfirmed, labelKey: 'donations.commitments.status.accepted' },
    {
      value: DonationCommitmentStatus.UnknownReserved,
      labelKey: 'donations.commitments.status.underReview',
    },
    {
      value: DonationCommitmentStatus.CancelledRejected,
      labelKey: 'donations.commitments.status.cancelledRejected',
    },
  ];
}
