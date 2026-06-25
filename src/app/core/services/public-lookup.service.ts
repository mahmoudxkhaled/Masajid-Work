import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { COUNTRY_ALPHA3_TO_ALPHA2 } from '../data/country-alpha3-to-alpha2.data';
import { ApiService } from '../api/api.service';
import { CountryLookup, CurrencyLookup } from '../models/lookup.model';

@Injectable({
  providedIn: 'root',
})
export class PublicLookupService {
  private regionDisplayNamesEn?: Intl.DisplayNames;
  private regionDisplayNamesAr?: Intl.DisplayNames;

  constructor(private readonly apiService: ApiService) { }

  getCountries(): Observable<CountryLookup[]> {
    return this.apiService.callAPI(100107, '', []).pipe(
      map((response) => this.mapCountriesResponse(response)),
    );
  }

  getCurrencies(): Observable<CurrencyLookup[]> {
    return this.apiService.callAPI(100108, '', []).pipe(
      map((response) => this.mapCurrenciesResponse(response)),
    );
  }

  getCountryLabel(country: CountryLookup, isArabic: boolean): string {
    if (isArabic) {
      if (country.nameAr) {
        return country.nameAr;
      }
      const localized = this.getLocalizedRegionName(country.code, 'ar');
      if (localized) {
        return localized;
      }
    }
    return country.nameEn;
  }

  getCurrencyLabel(currency: CurrencyLookup, isArabic: boolean): string {
    if (isArabic && currency.nameAr) {
      return currency.nameAr;
    }
    return currency.nameEn;
  }

  sortCountriesByLabel(countries: CountryLookup[], isArabic: boolean): CountryLookup[] {
    const locale = isArabic ? 'ar' : 'en';
    return [...countries].sort((a, b) =>
      this.getCountryLabel(a, isArabic).localeCompare(this.getCountryLabel(b, isArabic), locale),
    );
  }

  findCountryByCode(code: string, countries: CountryLookup[]): CountryLookup | undefined {
    return countries.find((item) => item.code === code);
  }

  private mapCountriesResponse(response: any): CountryLookup[] {
    if (!response?.success || !response.message) {
      return [];
    }

    const message = response.message as Record<string, unknown>;

    if (this.isCodeToNameMap(message)) {
      return Object.entries(message)
        .map(([code, name]) => ({
          code: code.toUpperCase(),
          nameEn: String(name).trim(),
        }))
        .filter((item) => item.code.length > 0 && item.nameEn.length > 0)
        .sort((a, b) => a.nameEn.localeCompare(b.nameEn));
    }

    const items = this.extractDictionaryItems<Record<string, unknown>>(message, [
      'Countries',
      'Countries_List',
      'Country_List',
    ]);
    return items
      .map((item) => this.mapCountryItem(item))
      .filter((item) => item.code.length > 0);
  }

  private mapCurrenciesResponse(response: any): CurrencyLookup[] {
    if (!response?.success || !response.message) {
      return [];
    }

    const message = response.message as Record<string, unknown>;

    if (this.isCodeToNameMap(message)) {
      return Object.entries(message)
        .map(([code, name]) => ({
          code: code.toUpperCase(),
          nameEn: String(name).trim(),
        }))
        .filter((item) => item.code.length > 0 && item.nameEn.length > 0)
        .sort((a, b) => a.nameEn.localeCompare(b.nameEn));
    }

    const items = this.extractDictionaryItems<Record<string, unknown>>(message, [
      'Currencies',
      'Currencies_List',
      'Currency_List',
    ]);
    return items
      .map((item) => this.mapCurrencyItem(item))
      .filter((item) => item.code.length > 0);
  }

  private isCodeToNameMap(message: Record<string, unknown>): boolean {
    const entries = Object.entries(message);
    if (!entries.length) {
      return false;
    }
    return entries.every(
      ([key, value]) => /^[A-Z]{3}$/i.test(key) && typeof value === 'string',
    );
  }

  private mapCountryItem(item: Record<string, unknown>): CountryLookup {
    return {
      code: this.readCode(item),
      nameEn: this.readNameEn(item),
      nameAr: this.readNameAr(item) || undefined,
    };
  }

  private mapCurrencyItem(item: Record<string, unknown>): CurrencyLookup {
    return {
      code: this.readCode(item),
      nameEn: this.readNameEn(item),
      nameAr: this.readNameAr(item) || undefined,
      symbol: this.readString(item, 'Symbol') || undefined,
    };
  }

  private readCode(item: Record<string, unknown>): string {
    return (
      this.readString(item, 'Code') ||
      this.readString(item, 'Country_Code') ||
      this.readString(item, 'Currency_Code')
    ).toUpperCase();
  }

  private readNameEn(item: Record<string, unknown>): string {
    return this.readString(item, 'Name') || this.readString(item, 'Name_En');
  }

  private readNameAr(item: Record<string, unknown>): string {
    return this.readString(item, 'Name_Regional') || this.readString(item, 'Name_Ar');
  }

  private extractDictionaryItems<T>(
    message: Record<string, unknown> | undefined,
    keys: string[],
  ): T[] {
    if (!message) {
      return [];
    }

    for (const key of keys) {
      const nestedKey = key.charAt(0).toLowerCase() + key.slice(1);
      const dictionary = message[key] ?? message[nestedKey];
      if (dictionary && typeof dictionary === 'object' && !Array.isArray(dictionary)) {
        return Object.values(dictionary as Record<string, T>);
      }
    }

    if (this.isIndexedItemDictionary(message)) {
      return Object.values(message as Record<string, T>);
    }

    return [];
  }

  private isIndexedItemDictionary(message: Record<string, unknown>): boolean {
    const entries = Object.entries(message);
    if (!entries.length) {
      return false;
    }
    return entries.every(
      ([entryKey, entryValue]) =>
        /^\d+$/.test(entryKey) &&
        entryValue !== null &&
        typeof entryValue === 'object' &&
        !Array.isArray(entryValue),
    );
  }

  private readString(item: Record<string, unknown>, key: string): string {
    const camelKey = key.charAt(0).toLowerCase() + key.slice(1);
    const value = item[key] ?? item[camelKey];
    return value === undefined || value === null ? '' : String(value).trim();
  }

  private getLocalizedRegionName(alpha3Code: string, locale: 'ar' | 'en'): string | null {
    const alpha2 = COUNTRY_ALPHA3_TO_ALPHA2[alpha3Code.toUpperCase()];
    if (!alpha2) {
      return null;
    }

    try {
      const displayNames =
        locale === 'ar'
          ? (this.regionDisplayNamesAr ??= new Intl.DisplayNames(['ar'], { type: 'region' }))
          : (this.regionDisplayNamesEn ??= new Intl.DisplayNames(['en'], { type: 'region' }));
      return displayNames.of(alpha2) ?? null;
    } catch {
      return null;
    }
  }
}
