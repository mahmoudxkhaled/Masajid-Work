export interface DonorRegistrationRequest {
  firstName: string;
  lastName: string;
  email: string;
  countryCode: string;
  city: string;
  latitude: number;
  longitude: number;
}

export interface FacilityRegistrationRequest {
  facilityName: string;
  representativeFirstName: string;
  representativeLastName: string;
  representativeEmail: string;
  countryCode: string;
  city: string;
  latitude: number;
  longitude: number;
}

export interface VendorRegistrationRequest {
  vendorName: string;
  representativeFirstName: string;
  representativeLastName: string;
  representativeEmail: string;
  countryCode: string;
  city: string;
  latitude: number;
  longitude: number;
}

export interface CharityCenterRegistrationRequest {
  centerName: string;
  representativeFirstName: string;
  representativeLastName: string;
  representativeEmail: string;
  countryCode: string;
  city: string;
  latitude: number;
  longitude: number;
}

export interface RegistrationSelectionCard {
  icon: string;
  titleKey: string;
  descriptionKey: string;
  route: string;
  accentClass: string;
}
