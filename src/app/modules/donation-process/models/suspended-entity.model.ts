export interface SuspendedEntityBackend {
  Entity_ID?: number;
  Entity_Type_ID?: number;
  Suspended_At?: string;
  Suspension_Reason?: string;
}

export function createEmptySuspendedEntityRow(): SuspendedEntityBackend {
  return {};
}
