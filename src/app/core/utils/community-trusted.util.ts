export interface CommunityTrustedSource {
  Community_Trusted?: boolean;
  Donor?: {
    Community_Trusted?: boolean;
  };
}

export function readCommunityTrusted(source: CommunityTrustedSource | null | undefined): boolean {
  if (!source) {
    return false;
  }
  if (source.Community_Trusted === true) {
    return true;
  }
  return source.Donor?.Community_Trusted === true;
}
