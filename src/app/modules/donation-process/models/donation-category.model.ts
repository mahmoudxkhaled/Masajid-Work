export interface DonationCategoryBackend {
  Donation_Category_ID?: number;
  Donation_Type_ID?: number;
  Code?: string;
  Name?: string;
  Name_Regional?: string;
  Is_Service?: boolean;
  Default_Order?: number;
  Is_Active?: boolean;
}

export interface DonationCategory {
  id: number;
  donationTypeId: number;
  code: string;
  name: string;
  isService: boolean;
  defaultOrder: number;
  active: boolean;
}
