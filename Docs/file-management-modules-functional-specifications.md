# Functional Specifications Document for the File Management Modules

**App Name:** ERP System  
**Document Version:** 1.0  
**Frontend:** Angular  
**Backend:** (to be developed under separate task)  
**Communication:** RESTful Web APIs (JSON)

---

## 1. Purpose and Overview

The purpose of this document is to provide a high-level overview for the functional requirements expected from the **File Management Modules** which will be developed as part of the ERP System.

In summary, the File Management modules should be responsible for providing the ability for administrators and users to **manage and develop their Virtual Drives and File Systems**, and **customize them** based on their Entities' and/or Personal needs.

---

## 2. Modules Overview

The File Management modules consist mainly of the following modules, arranged in the ERP Functions as follows:

| ERP Function | Module | Code / Title |
|--------------|--------|---------------|
| **System Administration** | System Storage Management | SSM |
| **Entity Administration** | Entity Storage Management | ESM |
| **Document Control → Storage & Content Management** | Online Storage File Systems | OSFS |
| **Document Control → Storage & Content Management** | Shared File Systems | SFS |
| **Document Control → Storage & Content Management** | Document Control System | DCS |
| **Document Control → Storage & Content Management** | Electronic Document Management System | EDMS |

These 6 modules represent the core storage management functionalities, including access rights. Other modules may have their own storage functionalities which will be modelled through the same storage system but represented differently based on each module's functional requirements.

---

## 3. APIs

The system should follow the **same API communication protocol** for the ERP System as presented in other briefing documents.

---

## 4. Functional Requirements

### 4.1. System Storage Management (SSM)

**Target users:** Developers and System Administrators.

| Capability | Description |
|------------|-------------|
| Virtual Drives | Full management of Virtual Drives |
| File Systems | List File Systems |
| Create/Manage File Systems | Create and manage File Systems **only if** the Developer or System Administrator has an Entity Admin role who owns the Virtual Drive which will host those File Systems |
| Monitoring | Monitor Virtual Drives & Storage Capacities |
| Traffic | Monitor Virtual Drives total uploads, downloads, and files traffic |

---

### 4.2. Entity Storage Management (ESM)

**Target users:** Entity Administrators.

| Capability | Description |
|------------|-------------|
| Virtual Drives | Full management of Virtual Drives **owned by the Entity** |
| File Systems | Full management of File Systems hosted in drives owned by the Entity |
| Synchronization | Perform Synchronization operations with local storage (Up/Down/Full Sync) |
| Monitoring | Monitor owned Virtual Drives & Storage Capacities |
| Traffic | Monitor owned Virtual Drives total uploads, downloads, and files traffic |
| Storage Settings | Manage the Entity's Storage Settings (e.g. ability of Entity Users to share files internally or externally) |
| Access Rights | Manage Access Rights to owned file systems, Sharing File Systems expiry, etc. |

---

### 4.3. Online Storage File Systems (OSFS)

**Role:** File Explorer UI for the file systems.

| Step / Scope | Functionality |
|--------------|---------------|
| Drive level | List Virtual Drives **owned by the Entity** |
| When a drive is selected | List File Systems hosted in the drive |
| When a File System is selected | • Full management of Folders & File Allocations within the selected file system<br>• Full access to Upload/Download any file to/from the selected file system |

---

### 4.4. Shared File Systems (SFS)

**Role:** Interface for any user to create and manage their own shared file systems (when Entity storage settings allow).

| Capability | Description |
|------------|-------------|
| Create | Create shared File Systems |
| Copy | Copy Files/Folders from the Main File Systems to Shared File Systems (as **static copies** or **linked copies**) |
| Links | Provide access links to shared FSs (links should be **accessible to system guests**) |
| Access | Manage access rights to links and their expiry |
| Amendments | Allow/Disallow certain accounts to amend/modify files (to be discussed if required) |

---

### 4.5. Document Control System (DCS)

*Details to be advised in later document versions.*

---

### 4.6. Electronic Document Management System (EDMS)

*Details to be advised in later document versions.*

---

## Quick Reference: Module Codes

| Code | Module |
|------|--------|
| SSM | System Storage Management |
| ESM | Entity Storage Management |
| OSFS | Online Storage File Systems |
| SFS | Shared File Systems |
| DCS | Document Control System |
| EDMS | Electronic Document Management System |

---

*Document Version: 1.0*
