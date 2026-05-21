export type DonorCategoryId =
  | 'carpets'
  | 'fans'
  | 'sound'
  | 'furniture'
  | 'cleaning'
  | 'maintenance'
  | 'painting'
  | 'lighting';

export interface DonorRegistrationRequest {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  country: string;
  city: string;
  radiusKm: number;
  categories: DonorCategoryId[];
  acceptTerms: boolean;
  confirmPhysicalOnly: boolean;
}

export interface FacilityRegistrationRequest {
  facilityName: string;
  facilityType: string;
  description: string;
  address: string;
  city: string;
  country: string;
  contactPhone: string;
  repFullName: string;
  repEmail: string;
  repPhone: string;
  repRole: string;
  password: string;
  reviewNotes: string;
  certifyAccurate: boolean;
  agreePhysicalPolicy: boolean;
  agreeTerms: boolean;
}

export interface VendorRegistrationRequest {
  fullName: string;
  email: string;
  password: string;
  businessName: string;
  businessType: string;
  location: string;
  businessPhone: string;
  serviceCategories: DonorCategoryId[];
  agreeDisclosure: boolean;
}

export interface CharityCenterRegistrationRequest {
  centerName: string;
  organizationType: string;
  address: string;
  contactEmail: string;
  phone: string;
  missionDescription: string;
  repFullName: string;
  repRole: string;
  repEmail: string;
  repPhone: string;
  password: string;
  authorizeVerification: boolean;
  confirmPhysicalPolicy: boolean;
}

export interface RegistrationSelectionCard {
  icon: string;
  titleKey: string;
  descriptionKey: string;
  route: string;
  accentClass: string;
}
