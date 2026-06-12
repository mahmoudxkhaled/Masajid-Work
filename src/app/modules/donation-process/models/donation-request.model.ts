export interface DonationRequestBackend {
  Donation_Request_ID?: number;
  Entity_ID?: number;
  Donation_Category_ID?: number;
  Title?: string;
  Title_Regional?: string;
  Description?: string;
  Description_Regional?: string;
  Status_ID?: number;
  Quantity?: number;
  Unit?: string;
  Estimated_Cost?: number;
  Currency_Code?: string;
  Needs_Installation?: boolean;
  City?: string;
  Country_Code?: string;
  Created_At?: string;
  Updated_At?: string;
}

export interface DonationRequestListItem {
  id: string;
  title: string;
  statusId: number;
  categoryId: number;
  estimatedCost: number;
  currencyCode: string;
  createdAt: string;
}
