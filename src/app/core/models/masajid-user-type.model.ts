export enum MasajidUserType {
  SystemAdmin = 'system-admin',
  FacilityRepresentative = 'facility-representative',
  Donor = 'donor',
  Vendor = 'vendor',
  CharityCenterRepresentative = 'charity-center-representative',
  Unknown = 'unknown',
}

export const EntityTypeId = {
  Donor: 0,
  Facility: 1,
  Vendor: 2,
  CharityCenter: 3,
} as const;
