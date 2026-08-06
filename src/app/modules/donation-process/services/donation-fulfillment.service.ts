import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, finalize } from 'rxjs';
import { ApiService } from 'src/app/core/api/api.service';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';
import {
  DonationFulfillmentBackend,
  DonationFulfillmentDetails,
  DonationFulfillmentListItem,
  DonationFulfillmentProofFile,
  SubmitFulfillmentProofRequest,
} from '../models/donation-fulfillment.model';

@Injectable({
  providedIn: 'root',
})
export class DonationFulfillmentService {
  isLoadingSubject = new BehaviorSubject<boolean>(false);

  constructor(
    private apiServices: ApiService,
    private localStorageService: LocalStorageService,
  ) {}

  submitFulfillmentProof(dto: SubmitFulfillmentProofRequest): Observable<any> {
    this.isLoadingSubject.next(true);
    const params = [
      dto.donationCommitmentId.toString(),
      dto.fulfilledBy.toString(),
      dto.donationVendorOfferId.toString(),
      String(dto.fulfillmentNote || '').trim(),
      dto.isRegional.toString(),
      this.formatIntegerList(dto.attachmentFileIds),
      dto.fileSystemId.toString(),
      dto.folderId.toString(),
    ];
    console.log('submitFulfillmentProof params', params);
    return this.apiServices.callAPI(100800, this.getAccessToken(), params).pipe(
      finalize(() => this.isLoadingSubject.next(false)),
    );
  }

  getFulfillmentDetails(donationFulfillmentId: number): Observable<any> {
    this.isLoadingSubject.next(true);
    return this.apiServices
      .callAPI(100801, this.getAccessToken(), [donationFulfillmentId.toString()])
      .pipe(finalize(() => this.isLoadingSubject.next(false)));
  }

  listFulfillments(donationRequestId: number): Observable<any> {
    this.isLoadingSubject.next(true);
    return this.apiServices
      .callAPI(100802, this.getAccessToken(), [donationRequestId.toString()])
      .pipe(finalize(() => this.isLoadingSubject.next(false)));
  }

  extractFulfillmentId(message: unknown): number {
    if (typeof message === 'number' || typeof message === 'string') {
      return Number(message);
    }
    if (message && typeof message === 'object') {
      const record = message as Record<string, unknown>;
      return Number(record['Donation_Fulfillment_ID'] ?? record['donation_Fulfillment_ID'] ?? 0);
    }
    return 0;
  }

  extractFulfillments(message: unknown): DonationFulfillmentBackend[] {
    if (!message) {
      return [];
    }
    if (Array.isArray(message)) {
      return message as DonationFulfillmentBackend[];
    }
    if (typeof message === 'object') {
      const record = message as Record<string, unknown>;
      const nested = record['Fulfillments'] ?? record['fulfillments'];
      if (Array.isArray(nested)) {
        return nested as DonationFulfillmentBackend[];
      }
      if (nested && typeof nested === 'object') {
        return Object.values(nested as Record<string, DonationFulfillmentBackend>);
      }
    }
    return [];
  }

  extractFulfillmentDetails(message: unknown): DonationFulfillmentBackend | null {
    if (!message) {
      return null;
    }
    if (typeof message !== 'object') {
      return null;
    }
    const record = message as Record<string, unknown>;
    const nested = record['Fulfillment'] ?? record['fulfillment'];
    if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
      return nested as DonationFulfillmentBackend;
    }
    if (record['Donation_Fulfillment_ID'] !== undefined || record['Fulfilled_By'] !== undefined) {
      return record as DonationFulfillmentBackend;
    }
    return null;
  }

  mapFulfillmentListItem(raw: DonationFulfillmentBackend): DonationFulfillmentListItem {
    return {
      id: String(raw.Donation_Fulfillment_ID || ''),
      fulfilledBy: Number(raw.Fulfilled_By || 0),
      fulfillmentNote: this.localStorageService.pickRequestContentField(
        String(raw.Fulfillment_Note || ''),
        String(raw.Fulfillment_Note_Regional || ''),
      ),
      donationVendorOfferId: Number(raw.Donation_Vendor_Offer_ID || 0),
      statusId: Number(raw.Status || 0),
      statusCode: String(raw.Status_Code || ''),
      createdAt: String(raw.Created_At || raw.Submitted_At || ''),
    };
  }

  mapFulfillmentDetails(raw: DonationFulfillmentBackend | null | undefined): DonationFulfillmentDetails | null {
    if (!raw) {
      return null;
    }

    return {
      id: String(raw.Donation_Fulfillment_ID || ''),
      donationCommitmentId: String(raw.Donation_Commitment_ID || ''),
      donationRequestId: String(raw.Donation_Request_ID || ''),
      fulfilledBy: Number(raw.Fulfilled_By || 0),
      fulfillmentNote: this.localStorageService.pickRequestContentField(
        String(raw.Fulfillment_Note || ''),
        String(raw.Fulfillment_Note_Regional || ''),
      ),
      donationVendorOfferId: Number(raw.Donation_Vendor_Offer_ID || 0),
      statusId: Number(raw.Status || 0),
      statusCode: String(raw.Status_Code || ''),
      createdAt: String(raw.Created_At || raw.Submitted_At || ''),
      fileSystemId: Number(raw.File_System_ID || 0),
      folderId: Number(raw.Folder_ID || 0),
      attachmentFileIds: this.extractAttachmentFileIds(raw),
      proofFiles: this.extractProofFiles(raw),
    };
  }

  private extractAttachmentFileIds(raw: DonationFulfillmentBackend): number[] {
    const value = raw.Attachment_File_IDs;
    if (Array.isArray(value)) {
      return value.map((id) => Number(id)).filter((id) => id > 0);
    }
    if (value && typeof value === 'object') {
      return Object.values(value)
        .map((id) => Number(id))
        .filter((id) => id > 0);
    }
    return [];
  }

  private extractProofFiles(raw: DonationFulfillmentBackend): DonationFulfillmentProofFile[] {
    const source = raw.Attachments ?? raw.Files;
    if (!source) {
      return this.extractAttachmentFileIds(raw).map((fileId) => ({
        fileId,
        fileName: '',
        fileType: '',
      }));
    }

    const items = Array.isArray(source) ? source : Object.values(source);
    return items.map((item) => {
      const record = item as Record<string, unknown>;
      return {
        fileId: Number(record['File_ID'] ?? record['file_ID'] ?? 0),
        fileName: String(record['File_Name'] ?? record['file_Name'] ?? ''),
        fileType: String(record['File_Type'] ?? record['file_Type'] ?? ''),
      };
    }).filter((item) => item.fileId > 0);
  }

  private formatIntegerList(numbers: number[]): string {
    if (!numbers || numbers.length === 0) {
      return '{}';
    }
    const uniqueNumbers = [...new Set(numbers)];
    return `{${uniqueNumbers.join(',')}}`;
  }

  private getAccessToken(): string {
    return this.localStorageService.getAccessToken();
  }
}
