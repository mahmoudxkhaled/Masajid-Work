import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, finalize } from 'rxjs';
import { ApiService } from 'src/app/core/api/api.service';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';
import {
  CreateVendorOfferRequest,
  UpdateVendorOfferRequest,
  VendorOfferBackend,
  VendorOfferDetails,
  VendorOfferListItem,
} from '../../models/vendor-offer.model';

@Injectable({
  providedIn: 'root',
})
export class VendorOffersService {
  isLoadingSubject = new BehaviorSubject<boolean>(false);

  constructor(
    private apiServices: ApiService,
    private localStorageService: LocalStorageService,
  ) { }

  listRequestsForVendor(
    categoryFilter: number[],
    countryCode: string,
    city: string,
    lastRequestId: number,
    filterCount: number,
  ): Observable<any> {
    this.isLoadingSubject.next(true);
    const params = [
      this.formatIntegerList(categoryFilter),
      countryCode || '',
      city || '',
      lastRequestId.toString(),
      filterCount.toString(),
    ];
    console.log('listRequestsForVendor params', params);
    return this.apiServices.callAPI(100700, this.getAccessToken(), params).pipe(
      finalize(() => this.isLoadingSubject.next(false)),
    );
  }

  createVendorOffer(dto: CreateVendorOfferRequest): Observable<any> {
    this.isLoadingSubject.next(true);
    const params = [
      dto.donationRequestId.toString(),
      dto.vendorEntityId.toString(),
      dto.offerAmount.toString(),
      dto.currencyCode.trim().toUpperCase(),
      dto.includesSupply.toString(),
      dto.includesInstallation.toString(),
      String(dto.description || '').trim(),
      dto.validUntil,
    ];
    console.log('createVendorOffer params', params);
    return this.apiServices.callAPI(100701, this.getAccessToken(), params).pipe(
      finalize(() => this.isLoadingSubject.next(false)),
    );
  }

  updateVendorOffer(dto: UpdateVendorOfferRequest): Observable<any> {
    this.isLoadingSubject.next(true);
    const params = [
      dto.donationVendorOfferId.toString(),
      dto.offerAmount.toString(),
      dto.currencyCode.trim().toUpperCase(),
      dto.includesSupply.toString(),
      dto.includesInstallation.toString(),
      String(dto.description || '').trim(),
      this.localStorageService.isRegionalApiInput().toString(),
      dto.validUntil,
    ];
    return this.apiServices.callAPI(100702, this.getAccessToken(), params).pipe(
      finalize(() => this.isLoadingSubject.next(false)),
    );
  }

  withdrawVendorOffer(donationVendorOfferId: number): Observable<any> {
    this.isLoadingSubject.next(true);
    return this.apiServices
      .callAPI(100703, this.getAccessToken(), [donationVendorOfferId.toString()])
      .pipe(finalize(() => this.isLoadingSubject.next(false)));
  }

  listVendorOffers(
    vendorEntityId: number,
    statusFilter: number[],
    lastOfferId: number,
    filterCount: number,
  ): Observable<any> {
    this.isLoadingSubject.next(true);
    const params = [
      vendorEntityId.toString(),
      this.formatIntegerList(statusFilter),
      lastOfferId.toString(),
      filterCount.toString(),
    ];
    return this.apiServices.callAPI(100704, this.getAccessToken(), params).pipe(
      finalize(() => this.isLoadingSubject.next(false)),
    );
  }

  listVendorOffersForRequest(donationRequestId: number): Observable<any> {
    this.isLoadingSubject.next(true);
    return this.apiServices
      .callAPI(100705, this.getAccessToken(), [donationRequestId.toString()])
      .pipe(finalize(() => this.isLoadingSubject.next(false)));
  }

  getVendorOfferDetails(donationVendorOfferId: number): Observable<any> {
    this.isLoadingSubject.next(true);
    return this.apiServices
      .callAPI(100706, this.getAccessToken(), [donationVendorOfferId.toString()])
      .pipe(finalize(() => this.isLoadingSubject.next(false)));
  }

  selectVendorOffer(donationVendorOfferId: number): Observable<any> {
    this.isLoadingSubject.next(true);
    return this.apiServices
      .callAPI(100707, this.getAccessToken(), [donationVendorOfferId.toString()])
      .pipe(finalize(() => this.isLoadingSubject.next(false)));
  }

  extractVendorOffers(message: Record<string, unknown> | undefined): VendorOfferBackend[] {
    if (!message) {
      return [];
    }
    const offers = message['Vendor_Offers'];
    if (Array.isArray(offers)) {
      return offers as VendorOfferBackend[];
    }
    return Object.values(offers ?? {}) as VendorOfferBackend[];
  }

  mapVendorOfferListItem(raw: VendorOfferBackend): VendorOfferListItem {
    return {
      id: String(raw.Donation_Vendor_Offer_ID || ''),
      donationRequestId: String(raw.Donation_Request_ID || ''),
      vendorEntityId: Number(raw.Vendor_Entity_ID || 0),
      requestTitle: this.localStorageService.pickRequestContentField(
        String(raw.Request_Title || ''),
        String(raw.Request_Title_Regional || ''),
      ),
      offerAmount: Number(raw.Offer_Amount || 0),
      currencyCode: String(raw.Currency_Code || ''),
      includesSupply: Boolean(raw.Includes_Supply),
      includesInstallation: Boolean(raw.Includes_Installation),
      description: this.localStorageService.pickRequestContentField(
        String(raw.Description || ''),
        String(raw.Description_Regional || ''),
      ),
      statusId: Number(raw.Status || 0),
      statusCode: String(raw.Status_Code || ''),
      validUntil: String(raw.Valid_Until || ''),
      createdAt: String(raw.Created_At || ''),
    };
  }

  mapVendorOfferDetails(raw: VendorOfferBackend | null | undefined): VendorOfferDetails | null {
    if (!raw) {
      return null;
    }

    return {
      id: String(raw.Donation_Vendor_Offer_ID || ''),
      donationRequestId: String(raw.Donation_Request_ID || ''),
      vendorEntityId: Number(raw.Vendor_Entity_ID || 0),
      requestTitle: this.localStorageService.pickRequestContentField(
        String(raw.Request_Title || ''),
        String(raw.Request_Title_Regional || ''),
      ),
      offerAmount: Number(raw.Offer_Amount || 0),
      currencyCode: String(raw.Currency_Code || ''),
      includesSupply: Boolean(raw.Includes_Supply),
      includesInstallation: Boolean(raw.Includes_Installation),
      description: this.localStorageService.pickRequestContentField(
        String(raw.Description || ''),
        String(raw.Description_Regional || ''),
      ),
      validUntil: String(raw.Valid_Until || ''),
      statusId: Number(raw.Status || 0),
      statusCode: String(raw.Status_Code || '').toUpperCase(),
      createdAt: String(raw.Created_At || ''),
      updatedAt: String(raw.Updated_At || ''),
    };
  }

  isActiveOffer(details: VendorOfferDetails | null): boolean {
    if (!details) {
      return false;
    }
    const code = details.statusCode.toUpperCase();
    if (code === 'WITHDRAWN' || code === 'SELECTED' || code === 'EXPIRED') {
      return false;
    }
    return true;
  }

  formatValidUntil(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}T00:00:00`;
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
