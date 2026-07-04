import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, map, Observable, of } from 'rxjs';

interface NominatimReverseResponse {
  address?: {
    country_code?: string;
  };
}

@Injectable({
  providedIn: 'root',
})
export class ReverseGeocodeService {
  private static readonly NOMINATIM_REVERSE_URL = 'https://nominatim.openstreetmap.org/reverse';

  constructor(private readonly http: HttpClient) {}

  resolveCountryAlpha2(lat: number, lng: number): Observable<string | null> {
    const headers = new HttpHeaders({
      Accept: 'application/json',
      'Accept-Language': 'en',
    });

    return this.http
      .get<NominatimReverseResponse>(ReverseGeocodeService.NOMINATIM_REVERSE_URL, {
        headers,
        params: {
          lat: String(lat),
          lon: String(lng),
          format: 'json',
          addressdetails: '1',
          zoom: '3',
        },
      })
      .pipe(
        map((response) => {
          const code = String(response?.address?.country_code ?? '').trim().toUpperCase();
          return code.length === 2 ? code : null;
        }),
        catchError(() => of(null)),
      );
  }
}
