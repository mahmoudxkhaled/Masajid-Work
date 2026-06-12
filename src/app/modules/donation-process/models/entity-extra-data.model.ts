export enum DonationEntityTypeId {
  Facility = 1,
  Vendor = 2,
  CharityCenter = 3,
}

export interface EntityExtraDataBackend {
  Entity_ID?: number;
  Entity_Type_ID?: number;
  Country_Code?: string;
}

export interface EntityExtraData {
  entityId: number;
  entityTypeId: DonationEntityTypeId;
  countryCode: string;
}
