export const DonationAttachmentOwnerType = {
  DonationRequest: 1,
  DonationCommitment: 2,
  DonationFulfillment: 3,
  DonationValidation: 4,
  DonationBreakdownRequest: 5,
} as const;

export const DonationAttachmentKind = {
  PhotoImage: 1,
  PdfDocument: 2,
  Video: 3,
  Other: 4,
} as const;


export type DonationAttachmentOwnerTypeValue =
  (typeof DonationAttachmentOwnerType)[keyof typeof DonationAttachmentOwnerType];

export type DonationAttachmentKindValue =
  (typeof DonationAttachmentKind)[keyof typeof DonationAttachmentKind];

export function isDonationAttachmentOwnerTypeReady(value: number | null | undefined): boolean {
  return value !== null && value !== undefined && Number(value) > 0;
}

export function isDonationAttachmentKindReady(value: number | null | undefined): boolean {
  return value !== null && value !== undefined && Number(value) > 0;
}

export function getDonationAttachmentKindLabelKey(kind: number): string {
  switch (kind) {
    case DonationAttachmentKind.PhotoImage:
      return 'donations.attachments.kinds.photoImage';
    case DonationAttachmentKind.PdfDocument:
      return 'donations.attachments.kinds.pdfDocument';
    case DonationAttachmentKind.Video:
      return 'donations.attachments.kinds.video';
    case DonationAttachmentKind.Other:
      return 'donations.attachments.kinds.other';
    default:
      return 'donations.attachments.kinds.other';
  }
}

export function resolveFulfillmentProofAttachmentOwner(donationFulfillmentId: number): {
  ownerType: number;
  ownerId: number;
} {
  return {
    ownerType: DonationAttachmentOwnerType.DonationFulfillment,
    ownerId: donationFulfillmentId,
  };
}

export function resolveValidationAttachmentOwner(donationValidationId: number): {
  ownerType: number;
  ownerId: number;
} {
  return {
    ownerType: DonationAttachmentOwnerType.DonationValidation,
    ownerId: donationValidationId,
  };
}

export function resolveValidationAttachmentOwnerForLink(
  donationValidationId: number,
): { ownerType: number; ownerId: number } | null {
  if (donationValidationId > 0) {
    return resolveValidationAttachmentOwner(donationValidationId);
  }
  return null;
}

export function resolveDonationAttachmentKindFromFile(file: File): number {
  const mimeType = String(file?.type || '').toLowerCase();

  if (mimeType.startsWith('image/')) {
    return DonationAttachmentKind.PhotoImage;
  }
  if (mimeType === 'application/pdf') {
    return DonationAttachmentKind.PdfDocument;
  }
  if (mimeType.startsWith('video/')) {
    return DonationAttachmentKind.Video;
  }

  return resolveDonationAttachmentKindFromFileName(String(file?.name || ''));
}

export function resolveDonationAttachmentKindFromFileName(fileName: string): number {
  const name = String(fileName || '').toLowerCase();
  const extension = name.includes('.') ? name.split('.').pop() || '' : '';

  switch (extension) {
    case 'pdf':
      return DonationAttachmentKind.PdfDocument;
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'webp':
      return DonationAttachmentKind.PhotoImage;
    case 'mp4':
    case 'mov':
    case 'webm':
      return DonationAttachmentKind.Video;
    default:
      return DonationAttachmentKind.Other;
  }
}
