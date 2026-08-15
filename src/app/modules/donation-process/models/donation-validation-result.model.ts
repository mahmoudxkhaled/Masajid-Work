export const DonationValidationResult = {
  Confirm: 1,
  Dispute: 2,
} as const;

export type DonationValidationResultValue =
  (typeof DonationValidationResult)[keyof typeof DonationValidationResult];

export function isValidDonationValidationResult(value: number): boolean {
  return (
    value === DonationValidationResult.Confirm || value === DonationValidationResult.Dispute
  );
}

export function getDonationValidationResultLabelKey(value: number): string {
  switch (value) {
    case DonationValidationResult.Confirm:
      return 'donations.validation.decision.confirm';
    case DonationValidationResult.Dispute:
      return 'donations.validation.decision.dispute';
    default:
      return 'donations.validation.decision.unknown';
  }
}

export function getDonationValidationResultSeverity(
  value: number,
): 'success' | 'info' | 'warning' | 'danger' | 'secondary' | 'contrast' {
  switch (value) {
    case DonationValidationResult.Confirm:
      return 'success';
    case DonationValidationResult.Dispute:
      return 'danger';
    default:
      return 'secondary';
  }
}
