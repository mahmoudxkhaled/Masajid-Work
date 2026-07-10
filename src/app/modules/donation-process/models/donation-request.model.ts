export interface DonationRequestBackend {
  Donation_Request_ID?: number;
  Entity_ID?: number;
  Donation_Category_ID?: number;
  Title?: string;
  Title_Regional?: string;
  Donation_Request_Status_ID?: number;
  Status_Code?: string;
  Quantity?: number;
  Unit?: string;
  Estimated_Cost?: number;
  Currency_Code?: string;
  City?: string;
  Country_Code?: string;
  Created_At?: string;
  Published_At?: string;
  Needs_Installation?: boolean;
}

export interface BrowseDonationRequestsFilter {
  categoryFilter: number[];
  latitude: number;
  longitude: number;
  radiusKm: number;
  maxEstimatedCost: number;
  countryCode: string;
  city: string;
  sortBy: number;
  lastRequestId: number;
  filterCount: number;
}

export interface DonationBrowseFilterForm {
  donationTypeId: number | null;
  donationCategoryId: number | null;
  countryCode: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
  maxEstimatedCost: number | null;
  sortBy: number;
}

export interface DonationRequestDetailsBackend extends DonationRequestBackend {
  Entity_ID?: number;
  Donation_Type_ID?: number;
  Description?: string;
  Description_Regional?: string;
  Needs_Installation?: boolean;
  Is_Regional?: boolean;
  Address?: string;
  Address_Regional?: string;
  Latitude?: number;
  Longitude?: number;
  Admin_Review_Note?: string;
  Review_Note?: string;
}

export interface DonationRequestListItem {
  id: string;
  title: string;
  statusId: number;
  statusCode: string;
  categoryId: number;
  quantity: number;
  unit: string;
  estimatedCost: number;
  currencyCode: string;
  city: string;
  countryCode: string;
  createdAt: string;
}

export interface DonationRequestSummary extends DonationRequestListItem { }

export interface DonationRequestDetails {
  id: string;
  entityId: number;
  donationTypeId: number;
  donationCategoryId: number;
  title: string;
  description: string;
  statusId: number;
  statusCode: string;
  quantity: number;
  unit: string;
  estimatedCost: number;
  currencyCode: string;
  needsInstallation: boolean;
  isRegional: boolean;
  address: string;
  latitude: number;
  longitude: number;
  city: string;
  countryCode: string;
  reviewNote: string;
  createdAt: string;
}

export interface DonationRequestWorkflowItem {
  statusId: number;
  statusName: string;
  changedAt: string;
  note: string;
}

export interface CreateDonationRequestRequest {
  entityId: number;
  donationCategoryId: number;
  title: string;
  description: string;
  isRegional: boolean;
  quantity: number;
  unit: string;
  estimatedCost: number;
  currencyCode: string;
  needsInstallation: boolean;
  address: string;
  latitude: number;
  longitude: number;
  city: string;
  countryCode: string;
}

export interface UpdateDonationRequestRequest {
  donationRequestId: number;
  donationCategoryId: number;
  title: string;
  description: string;
  isRegional: boolean;
  quantity: number;
  unit: string;
  estimatedCost: number;
  currencyCode: string;
  needsInstallation: boolean;
  address: string;
  latitude: number;
  longitude: number;
  city: string;
  countryCode: string;
}

export interface ListEntityDonationRequestsRequest {
  entityId: number;
  statusFilter: number[];
  lastRequestId: number;
  filterCount: number;
  textFilter: string;
}
