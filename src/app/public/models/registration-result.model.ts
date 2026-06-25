export enum RegistrationEntityTypeId {
  Donor = 0,
  Facility = 1,
  Vendor = 2,
  CharityCenter = 3,
}

export interface AddEntityRegistrationResponse {
  entityId: number;
  accountId: number;
  userId: number;
}

export type RegistrationResult =
  | { outcome: 'success' | 'pending_review'; messageKey: string; ids: AddEntityRegistrationResponse }
  | { outcome: 'error'; code: string; messageKey: string };
