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

export interface UpdateVendorOfferRequest {
  donationVendorOfferId: number;
  offerAmount: number;
  currencyCode: string;
  includesSupply: boolean;
  includesInstallation: boolean;
  description: string;
  validUntil: string;
}
