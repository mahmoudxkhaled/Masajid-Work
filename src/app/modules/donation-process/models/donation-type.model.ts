export interface DonationTypeBackend {
  Donation_Type_ID?: number;
  Code?: string;
  Name?: string;
  Name_Regional?: string;
  Description?: string;
  Description_Regional?: string;
  Is_Active?: boolean;
}

export interface DonationType {
  id: number;
  code: string;
  name: string;
  description: string;
  active: boolean;
}
