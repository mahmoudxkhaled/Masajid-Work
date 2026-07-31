export const DonationCommitmentStatus = {
  Pending: 1,
  Accepted: 2,
  Completed: 3,
  Cancelled: 4,
} as const;

export type DonationCommitmentStatusValue =
  (typeof DonationCommitmentStatus)[keyof typeof DonationCommitmentStatus];

export type CommitmentStatusSeverity = 'success' | 'info' | 'warning' | 'danger' | 'secondary' | 'contrast';

export function getCommitmentStatusLabelKey(status: number): string {
  switch (status) {
    case DonationCommitmentStatus.Pending:
      return 'donations.commitments.status.pending';
    case DonationCommitmentStatus.Accepted:
      return 'donations.commitments.status.accepted';
    case DonationCommitmentStatus.Completed:
      return 'donations.commitments.status.completed';
    case DonationCommitmentStatus.Cancelled:
      return 'donations.commitments.status.cancelled';
    default:
      return 'donations.commitments.status.unknown';
  }
}

export function getCommitmentStatusSeverity(status: number): CommitmentStatusSeverity {
  switch (status) {
    case DonationCommitmentStatus.Pending:
      return 'info';
    case DonationCommitmentStatus.Accepted:
      return 'success';
    case DonationCommitmentStatus.Completed:
      return 'success';
    case DonationCommitmentStatus.Cancelled:
      return 'danger';
    default:
      return 'secondary';
  }
}

export function isCommitmentPending(status: number): boolean {
  return status === DonationCommitmentStatus.Pending;
}

export function isCommitmentAccepted(status: number): boolean {
  return status === DonationCommitmentStatus.Accepted;
}

export function isCommitmentCompleted(status: number): boolean {
  return status === DonationCommitmentStatus.Completed;
}

export function isCommitmentCancelled(status: number): boolean {
  return status === DonationCommitmentStatus.Cancelled;
}

export function canCancelCommitment(status: number): boolean {
  return (
    status === DonationCommitmentStatus.Pending || status === DonationCommitmentStatus.Accepted
  );
}

export function canRespondToRepresentation(status: number): boolean {
  return status === DonationCommitmentStatus.Pending;
}

export function getCommitmentStatusFilterOptions(): { value: number; labelKey: string }[] {
  return [
    { value: DonationCommitmentStatus.Pending, labelKey: 'donations.commitments.status.pending' },
    { value: DonationCommitmentStatus.Accepted, labelKey: 'donations.commitments.status.accepted' },
    { value: DonationCommitmentStatus.Completed, labelKey: 'donations.commitments.status.completed' },
    { value: DonationCommitmentStatus.Cancelled, labelKey: 'donations.commitments.status.cancelled' },
  ];
}
