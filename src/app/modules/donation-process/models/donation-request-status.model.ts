export interface DonationRequestStatusBackend {
  Donation_Request_Status_ID?: number;
  Code?: string;
  Name?: string;
  Name_Regional?: string;
  Is_Terminal?: boolean;
  Sort_Order?: number;
}

export interface DonationRequestStatus {
  id: number;
  code: string;
  name: string;
}
