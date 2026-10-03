export const DonationStorageConfig = {
  fileSystemId: 1,

  folders: {
    donationRequests: 11,
    donationCommitments: 12,
    fulfillmentProofs: 13,
    communityValidations: 14,
    breakdownRequests: 15,
    otherDonationAttachments: 16,
  },
} as const;

export type DonationStorageFolderKey = keyof typeof DonationStorageConfig.folders;

export interface DonationStorageLocation {
  fileSystemId: number;
  folderId: number;
}

export function isDonationStorageLocationReady(
  folderKey: DonationStorageFolderKey,
): boolean {
  const fileSystemId = DonationStorageConfig.fileSystemId;
  const folderId = DonationStorageConfig.folders[folderKey];
  return fileSystemId != null && fileSystemId > 0 && folderId != null && folderId > 0;
}

export function getDonationStorageLocation(
  folderKey: DonationStorageFolderKey,
): DonationStorageLocation | null {
  if (!isDonationStorageLocationReady(folderKey)) {
    return null;
  }

  return {
    fileSystemId: Number(DonationStorageConfig.fileSystemId),
    folderId: Number(DonationStorageConfig.folders[folderKey]),
  };
}
