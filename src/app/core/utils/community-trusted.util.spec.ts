import { readCommunityTrusted } from './community-trusted.util';

describe('readCommunityTrusted', () => {
  it('keeps true from the account or donor payload', () => {
    expect(readCommunityTrusted({ Community_Trusted: true })).toBeTrue();
  });

  it('keeps false', () => {
    expect(readCommunityTrusted({ Community_Trusted: false })).toBeFalse();
  });

  it('does not treat a missing flag as trusted', () => {
    expect(readCommunityTrusted({})).toBeFalse();
    expect(readCommunityTrusted(null)).toBeFalse();
    expect(readCommunityTrusted(undefined)).toBeFalse();
  });

  it('reads a nested donor flag', () => {
    expect(readCommunityTrusted({ Donor: { Community_Trusted: true } })).toBeTrue();
    expect(readCommunityTrusted({ Donor: { Community_Trusted: false } })).toBeFalse();
  });

  it('does not treat a non-boolean value as trusted', () => {
    expect(readCommunityTrusted({ Community_Trusted: 'true' as unknown as boolean })).toBeFalse();
  });
});
