// TODO: Confirm Fulfilled_By values with backend/business owner before production release.
// These values are currently assumed by frontend instruction.
export const FulfilledBy = {
  Donor: 1,
  CharityCenter: 2,
  Vendor: 3,
} as const;

export type FulfilledByValue = (typeof FulfilledBy)[keyof typeof FulfilledBy];

export function isValidFulfilledBy(value: number): boolean {
  return (
    value === FulfilledBy.Donor ||
    value === FulfilledBy.CharityCenter ||
    value === FulfilledBy.Vendor
  );
}

export function getFulfilledByLabelKey(value: number): string {
  switch (value) {
    case FulfilledBy.Donor:
      return 'donations.commitments.fulfilledBy.donor';
    case FulfilledBy.CharityCenter:
      return 'donations.commitments.fulfilledBy.charityCenter';
    case FulfilledBy.Vendor:
      return 'donations.commitments.fulfilledBy.vendor';
    default:
      return 'donations.commitments.fulfilledBy.unknown';
  }
}

export function getFulfilledByOptions(): { value: number; labelKey: string }[] {
  return [
    { value: FulfilledBy.Donor, labelKey: 'donations.commitments.fulfilledBy.donor' },
    { value: FulfilledBy.CharityCenter, labelKey: 'donations.commitments.fulfilledBy.charityCenter' },
    { value: FulfilledBy.Vendor, labelKey: 'donations.commitments.fulfilledBy.vendor' },
  ];
}
