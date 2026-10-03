export interface SuspendedEntityBackend {
  Entity_ID?: number;
  Entity_Type_ID?: number;
  [key: string]: unknown;
}

export function createEmptySuspendedEntityRow(): SuspendedEntityBackend {
  return {};
}
