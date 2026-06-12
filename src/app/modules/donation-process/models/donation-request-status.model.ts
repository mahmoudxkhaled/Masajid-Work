export interface DonationRequestStatusBackend {
  Status_ID?: number;
  Code?: string;
  Name?: string;
  Name_Regional?: string;
}

export interface DonationRequestStatus {
  id: number;
  code: string;
  name: string;
}
