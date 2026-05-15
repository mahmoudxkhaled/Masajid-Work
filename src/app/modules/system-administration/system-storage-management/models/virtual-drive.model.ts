
export interface VirtualDrive {
  id: number;
  name: string;
  licenseId: number;
  capacity: number;
  active: boolean;
}


export interface VirtualDrivesFilters {
  entityFilter: number;
  licenseId: number;
  activeOnly: boolean;
}


export interface VirtualDriveRow {
  id: number;
  name: string;
  licenseId: number;

  isEntity: boolean;
  capacity: number;

  freeSpace: number;
  active: boolean;
}
