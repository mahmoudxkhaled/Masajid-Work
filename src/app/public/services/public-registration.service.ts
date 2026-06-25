import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { ApiService } from 'src/app/core/api/api.service';
import {
  RegistrationEntityTypeId,
  type AddEntityRegistrationResponse,
  type RegistrationResult,
} from '../models/registration-result.model';
import type {
  CharityCenterRegistrationRequest,
  DonorRegistrationRequest,
  FacilityRegistrationRequest,
  VendorRegistrationRequest,
} from '../models/public-registration.model';

@Injectable({
  providedIn: 'root',
})
export class PublicRegistrationService {
  constructor(private readonly apiService: ApiService) { }

  registerDonor(dto: DonorRegistrationRequest): Observable<RegistrationResult> {
    return this.addEntityRegistration(
      RegistrationEntityTypeId.Donor,
      dto.firstName,
      dto.lastName,
      dto.email,
      dto.countryCode,
      dto.city,
      String(dto.latitude),
      String(dto.longitude),
      'public.register.donor.success',
      'success',
    );
  }

  registerFacility(dto: FacilityRegistrationRequest): Observable<RegistrationResult> {
    return this.addEntityRegistration(
      RegistrationEntityTypeId.Facility,
      dto.facilityName,
      this.combineRepresentativeName(dto.representativeFirstName, dto.representativeLastName),
      dto.representativeEmail,
      dto.countryCode,
      dto.city,
      String(dto.latitude),
      String(dto.longitude),
      'public.register.facility.success',
      'pending_review',
    );
  }

  registerVendor(dto: VendorRegistrationRequest): Observable<RegistrationResult> {
    return this.addEntityRegistration(
      RegistrationEntityTypeId.Vendor,
      dto.vendorName,
      this.combineRepresentativeName(dto.representativeFirstName, dto.representativeLastName),
      dto.representativeEmail,
      dto.countryCode,
      dto.city,
      String(dto.latitude),
      String(dto.longitude),
      'public.register.vendor.success',
      'success',
    );
  }

  registerCharityCenter(dto: CharityCenterRegistrationRequest): Observable<RegistrationResult> {
    return this.addEntityRegistration(
      RegistrationEntityTypeId.CharityCenter,
      dto.centerName,
      this.combineRepresentativeName(dto.representativeFirstName, dto.representativeLastName),
      dto.representativeEmail,
      dto.countryCode,
      dto.city,
      String(dto.latitude),
      String(dto.longitude),
      'public.register.charity.success',
      'pending_review',
    );
  }

  private combineRepresentativeName(firstName: string, lastName: string): string {
    return `${firstName} ${lastName}`.trim();
  }

  private callRegistrationApi(code: number, parameters: string[]): Observable<any> {
    return this.apiService.callAPI(code, '', parameters);
  }

  private addEntityRegistration(
    entityTypeId: RegistrationEntityTypeId,
    firstName: string,
    lastName: string,
    adminEmail: string,
    countryCode: string,
    city: string,
    latitude: string,
    longitude: string,
    successMessageKey: string,
    successOutcome: 'success' | 'pending_review',
  ): Observable<RegistrationResult> {
    const params = [
      entityTypeId.toString(),
      firstName,
      lastName,
      adminEmail,
      countryCode,
      city,
      latitude,
      longitude,
    ];
    console.log('Add_Entity (400) params:', {
      Entity_Type_ID: params[0],
      First_Name: params[1],
      Last_Name: params[2],
      Admin_Email: params[3],
      Country_Code: params[4],
      City: params[5],
      Latitude: params[6],
      Longitude: params[7],
    });
    return this.callRegistrationApi(400, params).pipe(
      map((response) => {
        console.log('Add_Entity (400) response:', response);
        return this.mapAddEntityResponse(response, successMessageKey, successOutcome);
      }),
    );
  }

  private mapAddEntityResponse(
    response: any,
    successMessageKey: string,
    successOutcome: 'success' | 'pending_review',
  ): RegistrationResult {
    if (!response?.success) {
      const code = String(response?.message || '');
      return {
        outcome: 'error',
        code,
        messageKey: this.mapAddEntityError(code),
      };
    }

    const message = response.message || {};
    const ids: AddEntityRegistrationResponse = {
      entityId: Number(message.Entity_ID ?? 0),
      accountId: Number(message.Account_ID ?? 0),
      userId: Number(message.User_ID ?? 0),
    };

    return {
      outcome: successOutcome,
      messageKey: successMessageKey,
      ids,
    };
  }

  private mapAddEntityError(code: string): string {
    switch (code) {
      case 'DAP11130':
        return 'public.register.messages.invalidEmail';
      case 'DAP11141':
        return 'public.register.messages.emailExists';
      case 'DAP11142':
        return 'public.register.messages.invalidFirstName';
      case 'DAP11143':
        return 'public.register.messages.invalidLastName';
      case 'DAP11252':
        return 'public.register.messages.invalidEntityName';
      case 'DAP11256':
        return 'public.register.messages.invalidEntityType';
      case 'DAP11257':
        return 'public.register.messages.invalidCountryCode';
      case 'DAP11259':
        return 'public.register.messages.invalidCity';
      case 'DAP11264':
        return 'public.register.messages.invalidLatitude';
      case 'DAP11265':
        return 'public.register.messages.invalidLongitude';
      default:
        return 'public.register.messages.genericError';
    }
  }
}
