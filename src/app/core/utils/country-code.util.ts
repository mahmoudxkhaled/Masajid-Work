import { COUNTRY_ALPHA3_TO_ALPHA2 } from '../data/country-alpha3-to-alpha2.data';

let alpha2ToAlpha3Map: Record<string, string> | undefined;

function buildAlpha2ToAlpha3Map(): Record<string, string> {
  if (alpha2ToAlpha3Map) {
    return alpha2ToAlpha3Map;
  }

  alpha2ToAlpha3Map = {};
  for (const [alpha3, alpha2] of Object.entries(COUNTRY_ALPHA3_TO_ALPHA2)) {
    alpha2ToAlpha3Map[alpha2] = alpha3;
  }
  return alpha2ToAlpha3Map;
}

export function alpha2ToAlpha3(alpha2: string): string | null {
  const code = String(alpha2 ?? '').trim().toUpperCase();
  if (!code) {
    return null;
  }
  return buildAlpha2ToAlpha3Map()[code] ?? null;
}
