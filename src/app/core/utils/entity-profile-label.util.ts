import { EntityTypeId, MasajidUserType } from '../models/masajid-user-type.model';

export type EntityProfileLabelType = 'facility' | 'vendor' | 'charity' | 'default';

export function entityTypeIdToProfileLabelType(entityTypeId: number | null | undefined): EntityProfileLabelType {
  switch (Number(entityTypeId)) {
    case EntityTypeId.Facility:
      return 'facility';
    case EntityTypeId.Vendor:
      return 'vendor';
    case EntityTypeId.CharityCenter:
      return 'charity';
    default:
      return 'default';
  }
}

export function masajidUserTypeToProfileLabelType(userType: MasajidUserType | null | undefined): EntityProfileLabelType {
  switch (userType) {
    case MasajidUserType.FacilityRepresentative:
      return 'facility';
    case MasajidUserType.Vendor:
      return 'vendor';
    case MasajidUserType.CharityCenterRepresentative:
      return 'charity';
    default:
      return 'default';
  }
}

export function getEntityDetailsLabelKey(
  labelType: EntityProfileLabelType,
  field: 'title' | 'profile' | 'editEntity',
): string {
  return `entities.details.byType.${labelType}.${field}`;
}

export function getBreadcrumbEntityDetailsKey(labelType: EntityProfileLabelType): string {
  switch (labelType) {
    case 'facility':
      return 'facilityDetails';
    case 'vendor':
      return 'vendorDetails';
    case 'charity':
      return 'charityDetails';
    default:
      return 'entityDetails';
  }
}

export function getBreadcrumbEditEntityKey(labelType: EntityProfileLabelType): string {
  switch (labelType) {
    case 'facility':
      return 'editFacility';
    case 'vendor':
      return 'editVendor';
    case 'charity':
      return 'editCharity';
    default:
      return 'editEntity';
  }
}

export function getBreadcrumbAdministrationKey(labelType: EntityProfileLabelType): string {
  switch (labelType) {
    case 'facility':
      return 'facilityAdministration';
    case 'vendor':
      return 'vendorAdministration';
    case 'charity':
      return 'charityAdministration';
    default:
      return 'companyAdministration';
  }
}
