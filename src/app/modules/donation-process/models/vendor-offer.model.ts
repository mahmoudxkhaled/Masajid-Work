export interface VendorOfferBackend {
  Donation_Vendor_Offer_ID?: number;
  Donation_Request_ID?: number;
  Vendor_Entity_ID?: number;
  Vendor_User_ID?: number;
  Offer_Amount?: number;
  Currency_Code?: string;
  Includes_Supply?: boolean;
  Includes_Installation?: boolean;
  Description?: string;
  Description_Regional?: string;
  Valid_Until?: string;
  Status?: number;
  Created_At?: string;
  Updated_At?: string;
  Request_Title?: string;
  Request_Title_Regional?: string;
  Vendor_Offer_Status_ID?: number;
  Status_Code?: string;
}

export interface VendorOfferListItem {
  id: string;
  donationRequestId: string;
  vendorEntityId: number;
  requestTitle: string;
  offerAmount: number;
  currencyCode: string;
  includesSupply: boolean;
  includesInstallation: boolean;
  description: string;
  statusId: number;
  statusCode: string;
  validUntil: string;
  createdAt: string;
}

export interface VendorOfferDetails {
  id: string;
  donationRequestId: string;
  vendorEntityId: number;
  requestTitle: string;
  offerAmount: number;
  currencyCode: string;
  includesSupply: boolean;
  includesInstallation: boolean;
  description: string;
  validUntil: string;
  statusId: number;
  statusCode: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateVendorOfferRequest {
  donationRequestId: number;
  vendorEntityId: number;
  offerAmount: number;
  currencyCode: string;
  includesSupply: boolean;
  includesInstallation: boolean;
  description: string;
  validUntil: string;
}

export const VendorOfferStatus = {
  Active: 1,
  Selected: 2,
  Expired: 3,
  Withdrawn: 4,
} as const;

export function getVendorOfferStatusLabelKey(statusId: number, statusCode?: string): string {
  switch (Number(statusId) || 0) {
    case VendorOfferStatus.Active:
      return 'donations.vendorOffers.status.active';
    case VendorOfferStatus.Selected:
      return 'donations.vendorOffers.status.selected';
    case VendorOfferStatus.Expired:
      return 'donations.vendorOffers.status.expired';
    case VendorOfferStatus.Withdrawn:
      return 'donations.vendorOffers.status.withdrawn';
  }

  switch (String(statusCode || '').toUpperCase()) {
    case 'ACTIVE':
      return 'donations.vendorOffers.status.active';
    case 'SELECTED':
      return 'donations.vendorOffers.status.selected';
    case 'EXPIRED':
      return 'donations.vendorOffers.status.expired';
    case 'WITHDRAWN':
      return 'donations.vendorOffers.status.withdrawn';
    default:
      return 'donations.vendorOffers.status.unknown';
  }
}

export type VendorOfferStatusSeverity = 'success' | 'info' | 'warning' | 'danger' | 'secondary' | 'contrast';

export function getVendorOfferStatusSeverity(statusId: number, statusCode?: string): VendorOfferStatusSeverity {
  const id = Number(statusId) || 0;
  const code = String(statusCode || '').toUpperCase();

  if (id === VendorOfferStatus.Active || code === 'ACTIVE') {
    return 'info';
  }
  if (id === VendorOfferStatus.Selected || code === 'SELECTED') {
    return 'success';
  }
  if (id === VendorOfferStatus.Expired || code === 'EXPIRED') {
    return 'warning';
  }
  if (id === VendorOfferStatus.Withdrawn || code === 'WITHDRAWN') {
    return 'danger';
  }
  return 'secondary';
}

export function isActiveVendorOfferStatus(statusId: number, statusCode?: string): boolean {
  const id = Number(statusId) || 0;
  if (
    id === VendorOfferStatus.Withdrawn ||
    id === VendorOfferStatus.Selected ||
    id === VendorOfferStatus.Expired
  ) {
    return false;
  }
  if (id === VendorOfferStatus.Active) {
    return true;
  }

  const code = String(statusCode || '').toUpperCase();
  return code !== 'WITHDRAWN' && code !== 'SELECTED' && code !== 'EXPIRED';
}

export interface UpdateVendorOfferRequest {
  donationVendorOfferId: number;
  offerAmount: number;
  currencyCode: string;
  includesSupply: boolean;
  includesInstallation: boolean;
  description: string;
  validUntil: string;
}
