import { MasajidUserType } from '../models/masajid-user-type.model';
import {
  canAccessOpenValidationRoute,
  shouldShowOpenValidationToDonor,
} from './open-validation-access.util';

describe('open validation access', () => {
  it('keeps the page available to an admin whether or not the account is trusted', () => {
    expect(canAccessOpenValidationRoute(MasajidUserType.SystemAdmin, false)).toBeTrue();
    expect(canAccessOpenValidationRoute(MasajidUserType.SystemAdmin, true)).toBeTrue();
    expect(shouldShowOpenValidationToDonor(MasajidUserType.SystemAdmin, true)).toBeFalse();
  });

  it('shows the page to a trusted donor', () => {
    expect(canAccessOpenValidationRoute(MasajidUserType.Donor, true)).toBeTrue();
    expect(shouldShowOpenValidationToDonor(MasajidUserType.Donor, true)).toBeTrue();
  });

  it('hides the page from a donor who is not trusted', () => {
    expect(canAccessOpenValidationRoute(MasajidUserType.Donor, false)).toBeFalse();
    expect(shouldShowOpenValidationToDonor(MasajidUserType.Donor, false)).toBeFalse();
  });

  it('does not add the donor menu item for other roles', () => {
    expect(canAccessOpenValidationRoute(MasajidUserType.FacilityRepresentative, true)).toBeTrue();
    expect(shouldShowOpenValidationToDonor(MasajidUserType.Vendor, true)).toBeFalse();
    expect(shouldShowOpenValidationToDonor(MasajidUserType.CharityCenterRepresentative, false)).toBeFalse();
  });
});
