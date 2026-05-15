/**
 * Folder models for Storage (2B) Folder APIs.
 * Aligned with Docs/storage-management-file-system-api.md.
 * Kept simple so it is easy for juniors to understand.
 */

/**
 * Represents a Folder record returned from Folder APIs.
 */
export interface Folder {
  /**
   * Folder unique identifier (Folder_ID in the backend APIs).
   */
  folder_ID: number;
  Folder_ID?: number;

  /**
   * Display name of the folder.
   */
  folder_Name: string;
  Folder_Name?: string;

  /**
   * Parent folder identifier (0 for root folder).
   */
  parent_Folder_ID: number;
  Parent_Folder_ID?: number;

  /**
   * File system identifier this folder belongs to.
   */
  file_System_ID: number;
  File_System_ID?: number;
}

/**
 * Folder structure item from Get_Folder_Structure API.
 * Contains Folder_ID, Parent_Folder_ID, Folder_Name.
 */
export interface FolderStructureItem {
  /**
   * Folder unique identifier.
   */
  folder_ID: number;
  Folder_ID?: number;

  /**
   * Parent folder identifier (0 for root).
   */
  parent_Folder_ID: number;
  Parent_Folder_ID?: number;

  /**
   * Folder name.
   */
  folder_Name: string;
  Folder_Name?: string;
}

/**
 * Folder contents from Get_Folder_Contents API.
 * Contains both subfolders and files.
 */
export interface FolderContents {
  /**
   * List of subfolders in this folder.
   */
  folders?: Folder[];
  Folders?: Folder[];

  /**
   * List of files in this folder.
   */
  files?: any[];
  Files?: any[];
}

/**
 * Folder details from Create_Folder or Get_Folder_Details API.
 */
export interface FolderDetails {
  folder_ID?: number;
  Folder_ID?: number;
  folder_Name?: string;
  Folder_Name?: string;
  parent_Folder_ID?: number;
  Parent_Folder_ID?: number;
  file_System_ID?: number;
  File_System_ID?: number;
  created_At?: string;
  Created_At?: string;
  created_By?: number;
  Created_By?: number;
}
