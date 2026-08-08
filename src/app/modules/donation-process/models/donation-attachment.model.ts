export interface UploadedStorageFile {
  fileId: number;
  fileName: string;
  fileType: string;
  fileSize: number;
  folderId: number;
  fileSystemId: number;
}

export interface DonationAttachmentBackend {
  Donation_Attachment_ID?: number;
  Attachment_Kind?: number;
  File_ID?: number;
  Folder_ID?: number;
  File_System_ID?: number;
  Caption?: string;
  Caption_Regional?: string;
  Sort_Order?: number;
  Created_At?: string;
}

export interface DonationAttachment {
  donationAttachmentId: number;
  attachmentKind: number;
  fileId: number;
  folderId: number;
  fileSystemId: number;
  caption: string;
  sortOrder: number;
  createdAt: string;
}

export interface AddDonationAttachmentRequest {
  ownerType: number;
  ownerId: number;
  attachmentKind: number;
  fileId: number;
  folderId: number;
  fileSystemId: number;
  caption: string;
  isRegional: boolean;
  sortOrder: number;
}

export const DONATION_ATTACHMENT_MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

export const DONATION_ATTACHMENT_ALLOWED_EXTENSIONS = [
  'pdf',
  'png',
  'jpg',
  'jpeg',
  'webp',
] as const;
