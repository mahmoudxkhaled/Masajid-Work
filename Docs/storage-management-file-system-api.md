# Storage Management – File System API Reference

This document is the single source of truth for the **Storage Management Module (2B)** APIs: Files, Folders, File Systems, File Allocations, and Virtual Drives. Use it when implementing or changing upload, download, file-system, or storage features in the ERP frontend.

---

## 1. Module Overview

### 2A. Storage System Management
- Handles settings and configurations for Storage System Hardware, backups, etc.
- **Note:** These APIs are **not exposed** to the ERP system.

### 2B. Files, Folders and File Systems
- APIs for full file management: virtual drives, file systems, folders, files, and allocations.
- All APIs below belong to 2B.

---

## 2. Files Basic Operations

### 1) Upload_Request
- **Description:** Request to upload a file; returns an **Upload Token** for chunked upload.
- **Access Token:** Yes

**Input:**
| Parameter     | Type     | Description        |
|---------------|----------|--------------------|
| File_Name     | string   |                    |
| File_Type     | string   |                    |
| Last_Modified | datetime |                    |
| File_Size     | long     |                    |
| nChunks       | int      |                    |
| Chunk_Size    | int      |                    |
| File_System_ID | int     |                    |
| Folder_ID     | long     |                    |

**Output:** `string Upload_Token`

---

### 2) Upload_File_Chunk
- **Description:** Upload one chunk using the Upload Token and chunk index.
- **Access Token:** Yes

**Input:**
- **Query String:** `string Upload_Token`
- **Form Data:** `int Current_Chunk`, `long Offset`, `string Hash`
- **Form Files:** `Stream File_Chunk`

**Output:** `long Uploaded_File_ID`  
- **Important:** Value is **0 for all chunks except the last**. File ID is returned **only on the last chunk** and **only if all chunks were uploaded successfully** (per received chunk hashes).

---

### 3) Download_Request
- **Description:** Request to download a file; returns a **Download Token** for chunked download.
- **Access Token:** Yes

**Input:** `long File_ID`, `long Folder_ID`, `int File_System_ID`

**Output:** `string Download_Token`, `string File_Name`, `int Chunks_Count`

---

### 4) Download_File_Chunk
- **Description:** Download one chunk using the Download Token and chunk index.
- **Access Token:** Yes

**Input:**
- **Query String:** `string Download_Token`
- **Form Data:** `int Chunk_ID`

**Output:** **Response Body** – `Stream File_Chunk`

---

## 3. File Details (Metadata) APIs

| # | API                 | Description              | Input (key params)                    | Output           |
|---|---------------------|--------------------------|----------------------------------------|------------------|
| 5 | Get_File_Details    | Get file details         | File_ID, Folder_ID, File_System_ID     | FileDetails       |
| 6 | Update_File_Details | Update name/type         | File_ID, Folder_ID, File_System_ID, Name, Type | -         |
| 7 | Delete_File         | Delete physical file    | File_ID                                | -                |

**Note:** `Delete_File` is **not open for ERP**. Use `Delete_File_Allocation` instead.

---

## 4. File Systems Operations

| #  | API                                | Input (key params)           | Output / Notes                    |
|----|------------------------------------|------------------------------|-----------------------------------|
| 8  | List_File_System_Types            | -                            | List&lt;FileSystemType&gt;         |
| 9  | List_File_Systems                  | Entity_Filter, Drive_ID, Active_Only | List&lt;FileSystem&gt;      |
| 10 | Create_File_System                 | Name, Type, Owner_ID, Is_Entity_ID, Drive_ID | FileSystem          |
| 11 | Get_File_System_Details            | File_System_ID               | FileSystem                        |
| 12 | Update_File_System_Details        | File_System_ID, Name, Type   | -                                 |
| 13 | Delete_File_System                | File_System_ID               | -                                 |
| 14 | Restore_Deleted_File_System       | File_System_ID               | -                                 |
| 15 | Clear_File_System_Recycle_Bin     | File_System_ID               | -                                 |
| 16 | Restore_File_System_Recycle_Bin_Contents | File_System_ID        | -                                 |
| 17 | Get_File_System_Recycle_Bin_Contents | File_System_ID            | List Folders, List Files          |

**List_File_Systems – Entity_Filter:**
- `-1` = Account File Systems  
- `1` = Entity File Systems  
- `0` = Both  
Filtering depends on logged-in account; **Developer** role can filter all. Also: `Drive_ID` (0 = ignore), `Active_Only` (ignore deleted).

---

## 5. Folders Operations

| #  | API                    | Input (key params)                    | Output / Notes |
|----|------------------------|---------------------------------------|----------------|
| 18 | Create_Folder          | File_System_ID, Folder_Name, Parent_Folder_ID | FolderDetails  |
| 19 | Get_Folder_Details     | Folder_ID, File_System_ID             | FolderDetails  |
| 20 | Update_Folder_Details  | Folder_ID, File_System_ID, Folder_Name | -              |
| 21 | Delete_Folder          | Folder_ID, File_System_ID             | -              |
| 22 | Move_Folder            | Folder_ID, File_System_ID, New_Parent_Folder_ID | -       |
| 23 | Get_Folder_Structure   | File_System_ID, One_Level_Only         | List (Folder_ID, Parent_Folder_ID, Folder_Name) |
| 24 | Get_Folder_Contents    | Folder_ID, File_System_ID              | Folders, Files |
| 25 | Restore_Deleted_Folders| List&lt;long&gt; Folder_IDs, File_System_ID | -          |
| 26 | Get_Total_Folder_Size   | Folder_ID, File_System_ID               | long Total_Size |

---

## 6. File Allocations

| #  | API                         | Input (key params)                          | Output / Notes   |
|----|-----------------------------|---------------------------------------------|------------------|
| 26 | List_Allocation_Types      | -                                           | List AllocationType |
| 27 | Allocate_File              | File_ID, Folder_ID, File_System_ID, Allocation_Type | -        |
| 28 | Get_File_Allocation_Details| File_ID, Folder_ID, File_System_ID          | AllocationDetails |
| 29 | Update_File_Allocation_Details | File_ID, Folder_ID, File_System_ID, Allocation_Type | -  |
| 30 | Delete_File_Allocation     | File_ID, Folder_ID, File_System_ID          | - (use this instead of Delete_File in ERP) |
| 31 | Move_File                  | File_ID, Folder_ID, File_System_ID, New_Parent_Folder_ID | -   |
| 32 | Restore_Deleted_Files      | List&lt;long&gt; File_IDs, List&lt;long&gt; Folder_IDs, File_System_ID | List&lt;(long,long)&gt; Skipped IDs |

---

## 7. Virtual Drives

| #  | API                    | Input (key params)        | Output / Notes        |
|----|------------------------|---------------------------|------------------------|
| 33 | List_Drives            | Entity_Filter, License_ID, Active_Only | List&lt;Drive&gt; |
| 34 | Create_Virtual_Drive   | Drive_Name, License_ID, Capacity | Drive (Capacity: 0 = inactive, max = License max) |
| 35 | Get_Virtual_Drive_Details | Drive_ID               | Drive                 |
| 36 | Rename_Virtual_Drive   | Drive_ID, New_Name        | -                     |
| 37 | Update_Drive_Capacity  | Drive_ID, New_Capacity    | - (0 to License max)  |
| 38 | Activate_Drive         | Drive_ID                  | -                     |
| 39 | Deactivate_Drive       | Drive_ID                  | -                     |

**List_Drives – Entity_Filter:** `-1` (Account), `1` (Entity), `0` (both). **Developer** can see all.

---

## 8. Synchronization (Under Development)

| #  | API                    | Status             |
|----|------------------------|--------------------|
| 40 | Upload_Synchronization | Under Development  |
| 41 | Download_Synchronization | Under Development |
| 42 | Full_Synchronization   | Under Development  |

---

## 9. Permissions Matrix

Roles: **DEV | SADMIN | EADMIN | USER | GUEST**

- **Files Basic (1101, 1102, 1111–1115):** DEV, SADMIN, EADMIN, USER ✅ — GUEST ❌  
- **File Systems (1120–1129):** DEV, SADMIN, EADMIN, USER ✅  
- **Folders (1130–1137):** DEV, SADMIN, EADMIN, USER ✅  
- **File Allocations (1140–1146):** DEV, SADMIN, EADMIN, USER ✅  
- **Virtual Drives (1150–1156):** **List/Get/Rename/Update** ✅ DEV, SADMIN, EADMIN, USER; **Create/Activate/Deactivate** ✅ DEV & SADMIN only; GUEST ❌  
- **Synchronization (1160–1162):** DEV, SADMIN, EADMIN, USER ✅  

---

## 10. Error Codes

### Common (All File Server Actions)
- ERP12000 – Access Denied  
- ERP12001 – Blocked IP (Permanent)  
- ERP12002 – Blocked IP (Temporary)  
- ERP12005 – Missing Storage Access Token  
- ERP12006 – Invalid Storage Access Token  
- ERP12007 – Access Denied to perform this action  
- ERP12008 – Invalid Request Routing  
- ERP12009 – Request Under Development  
- ERP12010 – Response Management → Global Execution error  
- ERP12011 – API Call Execution → Global Execution error  
- ERP12012 – File Server Database Error  

### Common (2B Actions)
- ERP12240 – Invalid File ID  
- ERP12250 – Invalid Folder ID  
- ERP12260 – Invalid File System ID  
- ERP12270 – Invalid File System Access Token  
- ERP12280 – Invalid File Allocation (File ID + Folder ID)  
- ERP12290 – Invalid Drive ID  
- ERP12291 – Drive is inactive  
- ERP12292 – Access Denied to the drive(s) of this Owner ID  
- ERP12295 – Not enough File System Access Right to perform this action  
- ERP12297 – Access Denied. This action can only be performed by the File System owner or an account with ‘Full’ Access Right  
- ERP12298 – This action cannot be performed on a ‘Reference’ file allocation  
- ERP12299 – This action cannot be performed on a ‘Copy’ file allocation  

### Upload_Request
- ERP12220 – Invalid File Name  
- ERP12221 – Invalid File Type  
- ERP12222 – Invalid Date Format  
- ERP12223 – Invalid File Size (≤ 0)  
- ERP12224 – Invalid nChunks (0–4,000,000 ≈ 1 TB)  
- ERP12225 – nChunks not matching Chunk_Size  
- ERP12226 – Insufficient Storage Capacity  
- ERP12227 – File with same name exists in folder  

### Upload_File_Chunk
- ERP12230 – Invalid File Upload Token  
- ERP12231 – Invalid File Chunk ID (1 to nChunks)  
- ERP12232 – Invalid Offset (0 to File_Size)  
- ERP12233 – No File Chunks received  
- ERP12234 – File Chunk is empty  
- ERP12235 – File Chunk Hash empty  
- ERP12236 – File Chunk Hash invalid  
- ERP12237 – Error during file storage  

### Download
- ERP12241 – File contents currently unavailable  
- ERP12245 – Invalid/Expired Download Token  
- ERP12246 – Invalid File Chunk ID (1 to nChunks)  
- ERP12249 – File Chunk not yet ready, retry in few seconds  

### Other APIs
- List_File_Systems: ERP12248 – Invalid Entity Filter  
- Create_File_System: ERP12251 Invalid File System Name, ERP12252 Invalid File System Type  
- Update_File_System_Details: FWA12251 Invalid File System Name, FWA12252 Invalid File System Type  
- Delete_File_System: FWA12255 Cannot delete File System, already in use  
- Create_Folder: ERP12261 Invalid Folder Name, ERP12262 Invalid Parent Folder ID  
- Update_Folder_Details: ERP12261 Invalid Folder Name  
- Move_Folder: ERP12262 Invalid Parent Folder ID, ERP12266 Invalid Parent Folder ID -> Same Folder or one of its children  
- Restore_Deleted_Folders/Files: ERP12267 Invalid Array Length  
- Delete_File: ERP12247 File still contains active allocations  
- Update_File_Details: ERP12220 Invalid File Name, ERP12221 Invalid File Type  
- Update_File_Allocation_Details: ERP12263 Invalid File Allocation Type  
- Allocate_File: ERP12263 Invalid File Allocation Type, ERP12227 File with same name exists in folder  
- Move_File: ERP12227 File with same name exists in selected folder, ERP12262 Invalid Parent Folder ID  
- Create_Virtual_Drive: ERP12271 Invalid Drive Name, ERP12272 Invalid License ID, ERP12273 This License already has an assigned drive, ERP12274 Invalid Drive Capacity (should be from 0 to License max)  
- Rename_Virtual_Drive: ERP12271 Invalid Drive Name  
- Update_Drive_Capacity: ERP12274 Invalid Drive Capacity (should be from 0 to License max)  
- Set_File_System_Access_Permission: ERP12293 Invalid Access Type, ERP12294 Invalid Access Right  
- List_Account_File_Systems: ERP12296 Invalid Account ID  
- List_Account_FS_Permissions: ERP12260 Invalid File System ID, ERP12296 Invalid Account ID  

### List_File_System_Permissions (1170) — response interpretation

For the **`message`** shape (`access_Rights` raw rows vs `accounts_Access_Rights` effective per-account map), enums, and frontend usage, see **[file-system-permissions-list-response.md](./file-system-permissions-list-response.md)**.

---

## 11. Data Model (Schematics)

Two main layers:

1. **Physical Storage Layer**  
   - Files ↔ File Chunks, linked to Virtual Drives (and Licenses).

2. **File Systems Presentation Layer**  
   - File Systems, Folders, File Allocations (how files are presented/organized).

Relationships: **Licenses → Virtual Drives**; **Virtual Drives → Files → File Chunks**; **File Systems + Folders + File Allocations** reference/organize physical files.

---

## 12. Upload Workflow (Client vs Server)

**Client:** Page with filing → Request upload → Call Upload_Request → On error show message; else show progress → Loop: send chunk (Upload_File_Chunk) → If last chunk and success → Notify success.  

**Server:** Validate file system, folder, allocation and capacity → On error return error; else return Upload_Token → For each chunk: store and validate.

---

## 13. Download Workflow (Client vs Server)

**Client:** Page with filing → Request download → Call Download_Request → On error show message; else show progress → Loop: request chunk (Download_File_Chunk), store chunk, update progress → If last chunk → Notify success.  

**Server:** Check file exists → If not, File Not Found; else return Download_Token + Chunks_Count → For each request: return requested File_Chunk.

---

*Reference this document when implementing or changing file upload, download, file-system, or storage features in the ERP frontend.*
