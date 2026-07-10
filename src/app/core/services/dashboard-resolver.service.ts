import { Injectable } from '@angular/core';
import { Observable, map, of } from 'rxjs';
import { EntityExtraDataService } from 'src/app/modules/donation-process/services/entity-extra-data.service';
import { EntityTypeId, MasajidUserType } from '../models/masajid-user-type.model';
import { Roles } from '../models/system-roles';
import { LocalStorageService } from './local-storage.service';

@Injectable({
  providedIn: 'root',
})
export class DashboardResolverService {
  constructor(
    private localStorageService: LocalStorageService,
    private entityExtraDataService: EntityExtraDataService,
  ) {}

  resolveCurrentUserType(): Observable<MasajidUserType> {
    const cached = this.localStorageService.getMasajidUserType();
    if (cached) {
      return of(cached);
    }

    const systemAdminType = this.detectSystemAdmin();
    if (systemAdminType) {
      return of(this.cacheUserType(systemAdminType));
    }

    const donorType = this.tryResolveDonorFromAccount();
    if (donorType) {
      return of(donorType);
    }

    const entityId = Number(this.localStorageService.getAccountDetails()?.Entity_ID || 0);
    if (!entityId) {
      return of(this.cacheUserType(MasajidUserType.Unknown));
    }

    const cachedEntityTypeId = this.localStorageService.getEntityTypeId();
    if (cachedEntityTypeId !== null) {
      return of(this.cacheUserType(this.mapEntityTypeToUserType(cachedEntityTypeId)));
    }

    return this.entityExtraDataService.getEntityExtraData(entityId).pipe(
      map((response: any) => {
        if (!response?.success) {
          return this.resolveDonorFallback();
        }

        const mapped = this.entityExtraDataService.mapEntityExtraData(response.message || {});
        this.localStorageService.setEntityTypeId(mapped.entityTypeId);
        return this.cacheUserType(this.mapEntityTypeToUserType(mapped.entityTypeId));
      }),
    );
  }

  invalidateUserTypeCache(): void {
    this.localStorageService.clearMasajidUserContext();
  }

  isDonorAccount(): boolean {
    return Number(this.localStorageService.getAccountDetails()?.Entity_Role_ID ?? -1) === 0;
  }

  private tryResolveDonorFromAccount(): MasajidUserType | null {
    if (!this.isDonorAccount()) {
      return null;
    }

    this.localStorageService.setEntityTypeId(EntityTypeId.Donor);
    return this.cacheUserType(MasajidUserType.Donor);
  }

  private detectSystemAdmin(): MasajidUserType | null {
    const systemRoleId = Number(this.localStorageService.getAccountDetails()?.System_Role_ID || 0);
    if (systemRoleId === Roles.Developer || systemRoleId === Roles.SystemAdministrator) {
      return MasajidUserType.SystemAdmin;
    }
    return null;
  }

  private resolveDonorFallback(): MasajidUserType {
    if (this.isDonorAccount()) {
      return this.cacheUserType(MasajidUserType.Donor);
    }

    const systemRoleId = Number(this.localStorageService.getAccountDetails()?.System_Role_ID || 0);
    if (systemRoleId === Roles.SystemUser || systemRoleId === Roles.Guest) {
      return this.cacheUserType(MasajidUserType.Donor);
    }

    return this.cacheUserType(MasajidUserType.Unknown);
  }

  private mapEntityTypeToUserType(entityTypeId: number): MasajidUserType {
    switch (entityTypeId) {
      case EntityTypeId.Facility:
        return MasajidUserType.FacilityRepresentative;
      case EntityTypeId.Vendor:
        return MasajidUserType.Vendor;
      case EntityTypeId.CharityCenter:
        return MasajidUserType.CharityCenterRepresentative;
      case EntityTypeId.Donor:
        return MasajidUserType.Donor;
      default:
        return MasajidUserType.Unknown;
    }
  }

  private cacheUserType(userType: MasajidUserType): MasajidUserType {
    this.localStorageService.setMasajidUserType(userType);
    return userType;
  }
}
