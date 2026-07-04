import { AppLanguageCode } from '../config/app-branding.config';

export function isRegionalApiInput(lang: AppLanguageCode): boolean {
  return lang !== 'ar';
}

export function pickLocalizedField(
  defaultField: string,
  regionalField: string,
  lang: AppLanguageCode,
): string {
  if (lang === 'ar') {
    return regionalField || defaultField || '';
  }
  return defaultField || regionalField || '';
}

export function pickRequestContentField(
  defaultField: string,
  regionalField: string,
  lang: AppLanguageCode,
): string {
  if (lang === 'ar') {
    return defaultField || regionalField || '';
  }
  return regionalField || defaultField || '';
}
