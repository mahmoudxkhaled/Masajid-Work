import { MasajidUserType } from '../models/masajid-user-type.model';

export function canAccessOpenValidationRoute(
  userType: MasajidUserType | null | undefined,
  communityTrusted: boolean,
): boolean {
  if (userType === MasajidUserType.SystemAdmin) {
    return true;
  }
  if (userType === MasajidUserType.Donor) {
    return communityTrusted;
  }
  return true;
}

export function shouldShowOpenValidationToDonor(
  userType: MasajidUserType | null | undefined,
  communityTrusted: boolean,
): boolean {
  return userType === MasajidUserType.Donor && communityTrusted;
}
