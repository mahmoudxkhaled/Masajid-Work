import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, throwError, finalize } from 'rxjs';
import { ApiService } from 'src/app/core/api/api.service';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';
import {
  isDonationAttachmentKindReady,
  isDonationAttachmentOwnerTypeReady,
} from '../models/donation-attachment.constants';
import {
  AddDonationAttachmentRequest,
  DonationAttachment,
  DonationAttachmentBackend,
} from '../models/donation-attachment.model';

@Injectable({
  providedIn: 'root',
})
export class DonationAttachmentService {
  isLoadingSubject = new BehaviorSubject<boolean>(false);

  constructor(
    private apiServices: ApiService,
    private localStorageService: LocalStorageService,
  ) { }

  addDonationAttachment(dto: AddDonationAttachmentRequest): Observable<any> {
    if (!isDonationAttachmentOwnerTypeReady(dto.ownerType) || !isDonationAttachmentKindReady(dto.attachmentKind)) {
      return throwError(() => ({
        code: 'ENUMS_NOT_CONFIGURED',
        message: 'ENUMS_NOT_CONFIGURED',
      }));
    }

    if (!dto.fileId || !dto.fileSystemId) {
      return throwError(() => ({
        code: 'UPLOAD_LOCATION_NOT_CONFIGURED',
        message: 'UPLOAD_LOCATION_NOT_CONFIGURED',
      }));
    }

    this.isLoadingSubject.next(true);
    const params = [
      dto.ownerType.toString(),
      dto.ownerId.toString(),
      dto.attachmentKind.toString(),
      dto.fileId.toString(),
      dto.folderId.toString(),
      dto.fileSystemId.toString(),
      String(dto.caption || '').trim(),
      dto.isRegional.toString(),
      dto.sortOrder.toString(),
    ];

    return this.apiServices.callAPI(111000, this.getAccessToken(), params).pipe(
      finalize(() => this.isLoadingSubject.next(false)),
    );
  }

  listDonationAttachments(ownerType: number, ownerId: number): Observable<any> {
    this.isLoadingSubject.next(true);
    return this.apiServices
      .callAPI(111001, this.getAccessToken(), [ownerType.toString(), ownerId.toString()])
      .pipe(finalize(() => this.isLoadingSubject.next(false)));
  }

  removeDonationAttachment(donationAttachmentId: number): Observable<any> {
    this.isLoadingSubject.next(true);
    return this.apiServices
      .callAPI(111002, this.getAccessToken(), [donationAttachmentId.toString()])
      .pipe(finalize(() => this.isLoadingSubject.next(false)));
  }

  extractAttachments(message: Record<string, unknown> | undefined): DonationAttachmentBackend[] {
    if (!message) {
      return [];
    }

    const attachments = message['Attachments'];
    if (Array.isArray(attachments)) {
      return attachments as DonationAttachmentBackend[];
    }
    if (attachments && typeof attachments === 'object') {
      return Object.values(attachments as Record<string, DonationAttachmentBackend>);
    }

    return [];
  }

  mapDonationAttachment(raw: DonationAttachmentBackend): DonationAttachment {
    return {
      donationAttachmentId: Number(raw.Donation_Attachment_ID || 0),
      ownerType: Number(raw.Owner_Type || 0),
      ownerId: Number(raw.Owner_ID || 0),
      attachmentKind: Number(raw.Attachment_Kind || 0),
      fileId: Number(raw.File_ID || 0),
      folderId: Number(raw.Folder_ID || 0),
      fileSystemId: Number(raw.File_System_ID || 0),
      caption: this.localStorageService.pickRequestContentField(
        String(raw.Caption || ''),
        String(raw.Caption_Regional || ''),
      ),
      sortOrder: Number(raw.Sort_Order || 0),
      fileName: String(raw.File_Name || ''),
      fileType: String(raw.File_Type || ''),
      createdAt: String(raw.Created_At || ''),
      isActive: raw.Is_Active === undefined ? true : Boolean(raw.Is_Active),
    };
  }

  mapDonationAttachments(rawItems: DonationAttachmentBackend[]): DonationAttachment[] {
    return rawItems.map((item) => this.mapDonationAttachment(item));
  }

  private getAccessToken(): string {
    return this.localStorageService.getAccessToken();
  }
}
