import { AfterViewInit, Component, ElementRef, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { AbstractControl } from '@angular/forms';
import { Subscription, merge } from 'rxjs';
import { getCountryCentroid } from 'src/app/core/data/country-centroids.data';
import { PublicLookupService } from 'src/app/core/services/public-lookup.service';
import { ReverseGeocodeService } from 'src/app/core/services/reverse-geocode.service';
import { alpha2ToAlpha3 } from 'src/app/core/utils/country-code.util';
import * as L from 'leaflet';

@Component({
  standalone: false,
  selector: 'app-register-location-picker',
  templateUrl: './register-location-picker.component.html',
  styleUrl: './register-location-picker.component.scss',
})
export class RegisterLocationPickerComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('map') mapElement?: ElementRef<HTMLDivElement>;

  @Input({ required: true }) latitudeControl!: AbstractControl;
  @Input({ required: true }) longitudeControl!: AbstractControl;
  @Input() countryCodeControl?: AbstractControl;
  @Input() requireCountry = true;
  @Input() showCoordinates = true;
  @Input() centerMapOnCountry = false;

  locating = false;
  locationErrorKey = '';
  mapLoading = true;

  private map?: L.Map;
  private marker?: L.Marker;
  private countrySubscription?: Subscription;
  private coordSubscription?: Subscription;
  private countriesSubscription?: Subscription;
  private resizeObserver?: ResizeObserver;
  private lastCountryCode = '';
  private skipCountryClear = false;
  private allowedCountryCodes = new Set<string>();
  private pendingGeoCoords: { lat: number; lng: number } | null = null;
  private refreshTimeouts: ReturnType<typeof setTimeout>[] = [];
  private destroyed = false;

  private static readonly defaultLat = 30.0444;
  private static readonly defaultLng = 31.2357;
  private static readonly defaultZoom = 6;

  get hasCountryCode(): boolean {
    if (!this.requireCountry) {
      return true;
    }
    return String(this.countryCodeControl?.value ?? '').trim().length > 0;
  }

  constructor(
    private readonly reverseGeocode: ReverseGeocodeService,
    private readonly lookupService: PublicLookupService,
  ) {}

  ngOnInit(): void {
    this.countriesSubscription = this.lookupService.getCountries().subscribe((countries) => {
      this.allowedCountryCodes = new Set(countries.map((c) => c.code.toUpperCase()));
    });
  }

  ngAfterViewInit(): void {
    this.fixLeafletIcons();
    this.lastCountryCode = this.getCountryCode();

    if (this.countryCodeControl) {
      this.countrySubscription = this.countryCodeControl.valueChanges.subscribe(() => {
        this.onCountryChanged();
      });
    }

    this.coordSubscription = merge(
      this.latitudeControl.valueChanges,
      this.longitudeControl.valueChanges,
    ).subscribe(() => {
      if (this.map) {
        this.syncMarkerFromInputs();
      }
    });

    setTimeout(() => {
      if (!this.destroyed) {
        this.initMap();
      }
    }, 300);
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.clearRefreshTimeouts();
    this.countrySubscription?.unsubscribe();
    this.coordSubscription?.unsubscribe();
    this.countriesSubscription?.unsubscribe();
    this.resizeObserver?.disconnect();
    if (this.map) {
      this.map.off();
      this.map.remove();
      this.map = undefined;
    }
  }

  private initMap(): void {
    const element = this.mapElement?.nativeElement;
    if (!element || this.map) {
      return;
    }

    const code = this.getCountryCode();
    const countryCentroid = code ? getCountryCentroid(code) : null;
    const view =
      this.centerMapOnCountry && countryCentroid
        ? countryCentroid
        : this.getMapView();
    this.map = L.map(element, { attributionControl: false }).setView([view.lat, view.lng], view.zoom);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(this.map);

    this.map.on('click', (event: L.LeafletMouseEvent) => {
      if (this.requireCountry && !this.hasCountryCode) {
        return;
      }
      this.placeMarker(event.latlng.lat, event.latlng.lng);
    });

    const initial = this.readInitialCoords();
    if (this.pendingGeoCoords) {
      this.placeMarker(this.pendingGeoCoords.lat, this.pendingGeoCoords.lng, false);
      this.pendingGeoCoords = null;
    } else if (this.centerMapOnCountry && code) {
      if (initial) {
        this.placeMarker(initial.lat, initial.lng, false, false);
      }
      this.recenterMapOnCountry(code, false);
    } else if (initial) {
      this.placeMarker(initial.lat, initial.lng, false);
    } else if (code) {
      this.recenterMapOnCountry(code, false);
    }

    this.lastCountryCode = this.getCountryCode();

    this.observeMapResize(element);
    this.queueMapRefresh(this.centerMapOnCountry && code ? code : '');
    this.scheduleLater(() => this.markMapLoaded(), 200);
  }

  private markMapLoaded(): void {
    if (!this.destroyed) {
      this.mapLoading = false;
    }
  }

  private isMapAlive(): boolean {
    if (this.destroyed || !this.map) {
      return false;
    }

    const container = this.map.getContainer();
    return !!container?.isConnected;
  }

  private safeInvalidateSize(): void {
    if (!this.isMapAlive()) {
      return;
    }

    try {
      this.map!.invalidateSize();
    } catch {
      return;
    }
  }

  private safeSetView(lat: number, lng: number, zoom: number): void {
    if (!this.isMapAlive()) {
      return;
    }

    try {
      this.map!.setView([lat, lng], zoom);
    } catch {
      return;
    }
  }

  private clearRefreshTimeouts(): void {
    this.refreshTimeouts.forEach((timeoutId) => clearTimeout(timeoutId));
    this.refreshTimeouts = [];
  }

  private scheduleLater(callback: () => void, delayMs: number): void {
    const timeoutId = setTimeout(() => {
      this.refreshTimeouts = this.refreshTimeouts.filter((id) => id !== timeoutId);
      if (!this.destroyed) {
        callback();
      }
    }, delayMs);
    this.refreshTimeouts.push(timeoutId);
  }

  private observeMapResize(element: HTMLDivElement): void {
    if (!this.map || typeof ResizeObserver === 'undefined') {
      return;
    }

    this.resizeObserver = new ResizeObserver(() => {
      if (this.isMapAlive()) {
        this.safeInvalidateSize();
      }
    });

    this.resizeObserver.observe(element);
  }

  private refreshMapSize(): void {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this.safeInvalidateSize();
      });
    });
  }

  private queueMapRefresh(countryCode = ''): void {
    this.refreshMapSize();
    this.scheduleLater(() => this.safeInvalidateSize(), 150);
    this.scheduleLater(() => {
      this.safeInvalidateSize();
      if (!countryCode) {
        return;
      }
      const centroid = getCountryCentroid(countryCode);
      if (centroid) {
        this.safeSetView(centroid.lat, centroid.lng, centroid.zoom);
      }
    }, 400);
  }

  useMyLocation(): void {
    this.locationErrorKey = '';

    if (!navigator.geolocation) {
      this.locationErrorKey = 'public.register.location.errors.unsupported';
      return;
    }

    this.locating = true;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        if (!this.requireCountry) {
          this.applyCoordinates(lat, lng);
          this.locating = false;
          return;
        }
        this.resolveAndApplyGeolocation(lat, lng);
      },
      (error) => {
        this.locating = false;
        this.locationErrorKey = this.getGeolocationErrorKey(error.code);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  }

  get showLatitudeError(): boolean {
    return this.latitudeControl.touched && this.latitudeControl.invalid;
  }

  get showLongitudeError(): boolean {
    return this.longitudeControl.touched && this.longitudeControl.invalid;
  }

  get showLocationError(): boolean {
    return this.showLatitudeError || this.showLongitudeError;
  }

  onCoordinateInput(field: 'lat' | 'lng', event: Event): void {
    const value = (event.target as HTMLInputElement).value;

    if (field === 'lat') {
      this.latitudeControl.setValue(value);
      this.latitudeControl.markAsDirty();
      this.latitudeControl.updateValueAndValidity();
    } else {
      this.longitudeControl.setValue(value);
      this.longitudeControl.markAsDirty();
      this.longitudeControl.updateValueAndValidity();
    }

    this.syncMarkerFromInputs();
  }

  onCoordinateBlur(field: 'lat' | 'lng'): void {
    if (field === 'lat') {
      this.latitudeControl.markAsTouched();
      this.latitudeControl.updateValueAndValidity();
    } else {
      this.longitudeControl.markAsTouched();
      this.longitudeControl.updateValueAndValidity();
    }

    this.syncMarkerFromInputs();
  }

  private resolveAndApplyGeolocation(lat: number, lng: number): void {
    this.reverseGeocode.resolveCountryAlpha2(lat, lng).subscribe({
      next: (alpha2) => {
        if (!alpha2) {
          this.locating = false;
          this.locationErrorKey = 'public.register.location.errors.countryResolveFailed';
          return;
        }

        const alpha3 = alpha2ToAlpha3(alpha2);
        if (!alpha3) {
          this.locating = false;
          this.locationErrorKey = 'public.register.location.errors.countryResolveFailed';
          return;
        }

        if (this.allowedCountryCodes.size > 0 && !this.allowedCountryCodes.has(alpha3)) {
          this.locating = false;
          this.locationErrorKey = 'public.register.location.errors.countryNotInList';
          return;
        }

        this.applyCountryAndCoordinates(alpha3, lat, lng);
        this.locating = false;
      },
      error: () => {
        this.locating = false;
        this.locationErrorKey = 'public.register.location.errors.countryResolveFailed';
      },
    });
  }

  private applyCountryAndCoordinates(alpha3: string, lat: number, lng: number): void {
    this.skipCountryClear = true;

    if (this.countryCodeControl && this.getCountryCode() !== alpha3) {
      this.lastCountryCode = alpha3;
      this.countryCodeControl.setValue(alpha3);
      this.countryCodeControl.markAsDirty();
      this.countryCodeControl.markAsTouched();
      this.countryCodeControl.updateValueAndValidity();
    }

    this.skipCountryClear = false;
    this.applyCoordinates(lat, lng);
  }

  private applyCoordinates(lat: number, lng: number): void {
    this.locationErrorKey = '';
    this.updateForm(lat, lng);

    if (this.map) {
      this.placeMarker(lat, lng, false);
      this.queueMapRefresh();
      return;
    }

    this.pendingGeoCoords = { lat, lng };
  }

  private syncMarkerFromInputs(): void {
    if (!this.isMapAlive()) {
      return;
    }

    const coords = this.readInitialCoords();
    if (!coords) {
      this.removeMarker();
      return;
    }

    const latlng = L.latLng(coords.lat, coords.lng);

    if (this.marker) {
      this.marker.setLatLng(latlng);
    } else {
      this.marker = L.marker(latlng, { draggable: true }).addTo(this.map!);
      this.marker.on('dragend', () => {
        const position = this.marker!.getLatLng();
        this.updateForm(position.lat, position.lng);
      });
    }

    if (!this.centerMapOnCountry) {
      this.safeSetView(coords.lat, coords.lng, Math.max(this.map!.getZoom(), 13));
    }
  }

  private onCountryChanged(): void {
    const code = this.getCountryCode();

    if (code === this.lastCountryCode) {
      if (this.map) {
        this.refreshMapSize();
      }
      return;
    }

    this.lastCountryCode = code;

    if (this.skipCountryClear) {
      if (this.map) {
        this.refreshMapSize();
      }
      return;
    }

    if (!code) {
      if (this.map) {
        this.removeMarker();
        this.clearCoordinates();
      }
      return;
    }

    if (!this.map) {
      return;
    }

    this.recenterMapOnCountry(code, true);
  }

  private recenterMapOnCountry(code: string, clearCoords: boolean): void {
    const centroid = getCountryCentroid(code);
    if (!centroid || !this.isMapAlive()) {
      return;
    }

    if (clearCoords) {
      this.removeMarker();
      this.clearCoordinates();
    }

    this.safeSetView(centroid.lat, centroid.lng, centroid.zoom);
    this.queueMapRefresh(code);
  }

  private placeMarker(lat: number, lng: number, updateFormValues = true, moveView = true): void {
    if (!this.isMapAlive()) {
      return;
    }

    const latlng = L.latLng(lat, lng);

    if (this.marker) {
      this.marker.setLatLng(latlng);
    } else {
      this.marker = L.marker(latlng, { draggable: true }).addTo(this.map!);
      this.marker.on('dragend', () => {
        const position = this.marker!.getLatLng();
        this.updateForm(position.lat, position.lng);
      });
    }

    if (moveView) {
      this.safeSetView(lat, lng, Math.max(this.map!.getZoom(), 13));
    }
    if (updateFormValues) {
      this.updateForm(lat, lng);
    }
    this.locationErrorKey = '';
  }

  private removeMarker(): void {
    if (this.marker && this.map) {
      this.map.removeLayer(this.marker);
      this.marker = undefined;
    }
  }

  private clearCoordinates(): void {
    this.latitudeControl.setValue('');
    this.longitudeControl.setValue('');
    this.latitudeControl.markAsPristine();
    this.longitudeControl.markAsPristine();
    this.latitudeControl.markAsUntouched();
    this.longitudeControl.markAsUntouched();
    this.latitudeControl.updateValueAndValidity();
    this.longitudeControl.updateValueAndValidity();
  }

  private updateForm(lat: number, lng: number): void {
    this.latitudeControl.setValue(lat.toFixed(6));
    this.longitudeControl.setValue(lng.toFixed(6));
    this.latitudeControl.markAsDirty();
    this.longitudeControl.markAsDirty();
    this.latitudeControl.markAsTouched();
    this.longitudeControl.markAsTouched();
    this.latitudeControl.updateValueAndValidity();
    this.longitudeControl.updateValueAndValidity();
  }

  private getMapView(): { lat: number; lng: number; zoom: number } {
    const coords = this.readInitialCoords();
    if (coords) {
      return { lat: coords.lat, lng: coords.lng, zoom: 15 };
    }

    const code = this.getCountryCode();
    if (code) {
      const centroid = getCountryCentroid(code);
      if (centroid) {
        return centroid;
      }
    }

    return {
      lat: RegisterLocationPickerComponent.defaultLat,
      lng: RegisterLocationPickerComponent.defaultLng,
      zoom: RegisterLocationPickerComponent.defaultZoom,
    };
  }

  private readInitialCoords(): { lat: number; lng: number } | null {
    const lat = Number(String(this.latitudeControl.value ?? '').trim());
    const lng = Number(String(this.longitudeControl.value ?? '').trim());
    const valid =
      !Number.isNaN(lat) &&
      !Number.isNaN(lng) &&
      lat >= -90 &&
      lat <= 90 &&
      lng >= -180 &&
      lng <= 180;

    return valid ? { lat, lng } : null;
  }

  private getCountryCode(): string {
    return String(this.countryCodeControl?.value ?? '').trim().toUpperCase();
  }

  private getGeolocationErrorKey(code: number): string {
    switch (code) {
      case 1:
        return 'public.register.location.errors.denied';
      case 2:
        return 'public.register.location.errors.unavailable';
      case 3:
        return 'public.register.location.errors.timeout';
      default:
        return 'public.register.location.errors.unavailable';
    }
  }

  private fixLeafletIcons(): void {
    const iconBase = '/assets/leaflet/';
    delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: iconBase + 'marker-icon-2x.png',
      iconUrl: iconBase + 'marker-icon.png',
      shadowUrl: iconBase + 'marker-shadow.png',
    });
  }
}
