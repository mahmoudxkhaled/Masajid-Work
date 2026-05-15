
export interface FileSystemType {
  type_ID?: number;
  Type_ID?: number;
  name?: string;
  Name?: string;
}


export interface FileSystemListItem {
  file_System_ID: number;
  name: string;
  type: number;
  guid: string;
  owner_ID: number;
  is_Entity_FS: boolean;
  drive_ID: number;
  created_At: string;
  created_By: number;
  deleted_At: string;
  delete_Account_ID: number;
}


export interface FileSystem {
  file_System_ID?: number;
  File_System_ID?: number;
  name?: string;
  Name?: string;
  type?: number;
  Type?: number;
  drive_ID?: number;
  Drive_ID?: number;
  owner_ID?: number;
  Owner_ID?: number;
  is_Entity?: boolean;
  Is_Entity?: boolean;
  is_Active?: boolean;
  Is_Active?: boolean;
  used_Capacity?: number;
  Used_Capacity?: number;
}


export interface FileSystemsFilters {
  entityFilter: number;
  driveId: number;
  activeOnly: boolean;
}

export interface FileSystemOwnerContext {
  ownerId: number;
  isEntityId: boolean;
}

