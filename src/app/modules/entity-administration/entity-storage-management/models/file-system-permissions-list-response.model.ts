

export interface ListFileSystemPermissionsMessage {
  access_Rights?: FileSystemAccessRightRow[];
  accounts_Access_Rights?: AccountsAccessRightsMap;
}


export interface FileSystemAccessRightRow {
  fS_Access_ID?: number;
  file_System_ID?: number;
  access_Right: FileSystemAccessRightEnum | number;
  access_Right_Type: FileSystemAccessRightTypeEnum | number;
  permission_ID: number;
}


export type AccountsAccessRightsMap = Record<string, number>;

export enum FileSystemAccessRightEnum {
  None = 0,
  List = 1,
  Read = 2,
  Amend = 3,
  Modify = 4,
  Full = 5,
}

export enum FileSystemAccessRightTypeEnum {
  Account = 0,
  Group = 1,
  Role = 2,
  Entity = 3,
  Organization = 4,
  All = 5,
  Owner = 6,
  EntityAdmin = 7,
}

export function isListFileSystemPermissionsMessage(value: unknown): value is ListFileSystemPermissionsMessage {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const v = value as ListFileSystemPermissionsMessage;
  return Array.isArray(v.access_Rights) || v.accounts_Access_Rights != null;
}

export function parseAccountsAccessRights(map: AccountsAccessRightsMap | null | undefined): Map<number, FileSystemAccessRightEnum> {
  const out = new Map<number, FileSystemAccessRightEnum>();
  if (!map || typeof map !== 'object') {
    return out;
  }
  Object.entries(map).forEach(([accountIdStr, right]) => {
    const accountId = Number(accountIdStr);
    const r = Number(right);
    if (Number.isFinite(accountId) && accountId > 0 && Number.isFinite(r)) {
      out.set(accountId, r as FileSystemAccessRightEnum);
    }
  });
  return out;
}


