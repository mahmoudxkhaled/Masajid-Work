import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, finalize } from 'rxjs';
import { ApiService } from 'src/app/core/api/api.service';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';
import {
  DonationValidationBackend,
  DonationValidationDetails,
  DonationValidationListItem,
  SubmitDonationValidationRequest,
} from '../../models/donation-validation.model';

@Injectable({
  providedIn: 'root',
})
export class DonationValidationService {
  isLoadingSubject = new BehaviorSubject<boolean>(false);

  constructor(
    private apiServices: ApiService,
    private localStorageService: LocalStorageService,
  ) {}

  listDonationsOpenForValidation(
    categoryFilter: number[],
    lastRequestId: number,
    filterCount: number,
  ): Observable<any> {
    this.isLoadingSubject.next(true);
    const params = [
      this.formatIntegerList(categoryFilter),
      '0',
      '0',
      '0',
      lastRequestId.toString(),
      filterCount.toString(),
    ];
    return this.apiServices.callAPI(110000, this.getAccessToken(), params).pipe(
      finalize(() => this.isLoadingSubject.next(false)),
    );
  }

  submitDonationValidation(dto: SubmitDonationValidationRequest): Observable<any> {
    this.isLoadingSubject.next(true);
    const params = [
      dto.donationFulfillmentId.toString(),
      dto.validationResult.toString(),
      String(dto.notes || '').trim(),
      dto.isRegional.toString(),
      this.formatIntegerList(dto.validationAttachmentIds),
      dto.fileSystemId.toString(),
      dto.folderId.toString(),
    ];
    console.log('submitDonationValidation params', params);
    return this.apiServices.callAPI(110001, this.getAccessToken(), params).pipe(
      finalize(() => this.isLoadingSubject.next(false)),
    );
  }

  getValidationDetails(donationValidationId: number): Observable<any> {
    this.isLoadingSubject.next(true);
    return this.apiServices
      .callAPI(110002, this.getAccessToken(), [donationValidationId.toString()])
      .pipe(finalize(() => this.isLoadingSubject.next(false)));
  }

  listRequestValidations(donationRequestId: number): Observable<any> {
    this.isLoadingSubject.next(true);
    return this.apiServices
      .callAPI(110003, this.getAccessToken(), [donationRequestId.toString()])
      .pipe(finalize(() => this.isLoadingSubject.next(false)));
  }

  extractValidationId(message: unknown): number {
    if (typeof message === 'number' || typeof message === 'string') {
      return Number(message);
    }
    if (message && typeof message === 'object') {
      const record = message as Record<string, unknown>;
      return Number(record['Donation_Validation_ID'] ?? 0);
    }
    return 0;
  }

  extractValidations(message: unknown): DonationValidationBackend[] {
    if (!Array.isArray(message)) {
      return [];
    }
    return message as DonationValidationBackend[];
  }

  extractValidationDetails(message: unknown): DonationValidationBackend | null {
    if (!message || typeof message !== 'object') {
      return null;
    }
    return message as DonationValidationBackend;
  }

  mapValidationListItem(raw: DonationValidationBackend): DonationValidationListItem {
    return {
      id: String(raw.Donation_Validation_ID || ''),
      donationFulfillmentId: Number(raw.Donation_Fulfillment_ID || 0),
      validatorUserId: Number(raw.Validator_User_ID || 0),
      validationResult: Number(raw.Validation_Result || 0),
      notes: this.localStorageService.pickRequestContentField(
        String(raw.Notes || ''),
        String(raw.Notes_Regional || ''),
      ),
      validatedAt: String(raw.Validated_At || ''),
    };
  }

  mapValidationDetails(raw: DonationValidationBackend | null | undefined): DonationValidationDetails | null {
    if (!raw) {
      return null;
    }

    return {
      id: String(raw.Donation_Validation_ID || ''),
      donationRequestId: String(raw.Donation_Request_ID || ''),
      donationFulfillmentId: Number(raw.Donation_Fulfillment_ID || 0),
      validatorUserId: Number(raw.Validator_User_ID || 0),
      validatorName: this.localStorageService.pickLocalizedField(
        String(raw.Validator_Name || ''),
        String(raw.Validator_Name_Regional || ''),
      ),
      validationResult: Number(raw.Validation_Result || 0),
      notes: this.localStorageService.pickRequestContentField(
        String(raw.Notes || ''),
        String(raw.Notes_Regional || ''),
      ),
      submittedAt: String(raw.Validated_At || raw.Submitted_At || raw.Created_At || ''),
      statusId: Number(raw.Status || 0),
    };
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
