import { Injectable } from '@angular/core';
import { EMPTY, Observable } from 'rxjs';
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
  registerDonor(_dto: DonorRegistrationRequest): Observable<unknown> {
    // TODO: wire donor registration API
    return EMPTY;
  }

  registerFacility(_dto: FacilityRegistrationRequest): Observable<unknown> {
    // TODO: wire facility registration API
    return EMPTY;
  }

  registerVendor(_dto: VendorRegistrationRequest): Observable<unknown> {
    // TODO: wire vendor registration API
    return EMPTY;
  }

  registerCharityCenter(_dto: CharityCenterRegistrationRequest): Observable<unknown> {
    // TODO: wire charity center registration API
    return EMPTY;
  }
}
