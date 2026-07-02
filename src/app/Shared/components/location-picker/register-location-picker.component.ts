import { AfterViewInit, Component, ElementRef, Input, OnDestroy, ViewChild } from '@angular/core';
import { AbstractControl } from '@angular/forms';
import { Subscription, merge } from 'rxjs';
import { getCountryCentroid } from 'src/app/core/data/country-centroids.data';
import * as L from 'leaflet';

@Component({
  standalone: false,
  selector: 'app-register-location-picker',
  templateUrl: './register-location-picker.component.html',
  styleUrl: './register-location-picker.component.scss',
})
export class RegisterLocationPickerComponent implements AfterViewInit, OnDestroy {
  @ViewChild('map') mapElement?: ElementRef<HTMLDivElement>;

  @Input({ required: true }) latitudeControl!: AbstractControl;
  @Input({ required: true }) longitudeControl!: AbstractControl;
  @Input({ required: true }) countryCodeControl!: AbstractControl;

  locating = false;
  locationErrorKey = '';

  private map?: L.Map;
  private marker?: L.Marker;
  private countrySubscription?: Subscription;
  private coordSubscription?: Subscription;
  private resizeObserver?: ResizeObserver;
  private lastCountryCode = '';

  private static readonly defaultLat = 30.0444;
  private static readonly defaultLng = 31.2357;
  private static readonly defaultZoom = 6;

  get hasCountryCode(): boolean {
    return String(this.countryCodeControl.value ?? '').trim().length > 0;
  }

  ngAfterViewInit(): void {
    this.fixLeafletIcons();
    this.lastCountryCode = this.getCountryCode();

    this.countrySubscription = this.countryCodeControl.valueChanges.subscribe(() => {
      this.onCountryChanged();
    });

    this.coordSubscription = merge(
      this.latitudeControl.valueChanges,
      this.longitudeControl.valueChanges,
    ).subscribe(() => {
      if (this.map) {
        this.syncMarkerFromInputs();
      }
    });

    setTimeout(() => this.initMap(), 300);
  }

  ngOnDestroy(): void {
    this.countrySubscription?.unsubscribe();
    this.coordSubscription?.unsubscribe();
    this.resizeObserver?.disconnect();
    this.map?.remove();
  }

  private initMap(): void {
    const element = this.mapElement?.nativeElement;
    if (!element || this.map) {
      return;
    }

    const view = this.getMapView();
    this.map = L.map(element).setView([view.lat, view.lng], view.zoom);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(this.map);

    this.map.on('click', (event: L.LeafletMouseEvent) => {
      if (!this.hasCountryCode) {
        return;
      }
      this.placeMarker(event.latlng.lat, event.latlng.lng);
    });

    const initial = this.readInitialCoords();
    if (initial) {
      this.placeMarker(initial.lat, initial.lng);
    }

    this.observeMapResize(element);

    setTimeout(() => this.refreshMapSize(), 0);
    setTimeout(() => this.refreshMapSize(), 300);
    setTimeout(() => this.refreshMapSize(), 700);
    setTimeout(() => this.syncMarkerFromInputs(), 100);
  }

  private observeMapResize(element: HTMLDivElement): void {
    if (!this.map || typeof ResizeObserver === 'undefined') {
      return;
    }

    this.resizeObserver = new ResizeObserver(() => {
      this.refreshMapSize();
    });

    this.resizeObserver.observe(element);
  }

  private refreshMapSize(): void {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this.map?.invalidateSize();
      });
    });
  }

  useMyLocation(): void {
    this.locationErrorKey = '';

    if (!this.hasCountryCode) {
      return;
    }

    if (!navigator.geolocation) {
      this.locationErrorKey = 'public.register.location.errors.unsupported';
      return;
    }

    this.locating = true;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.placeMarker(position.coords.latitude, position.coords.longitude);
        this.locating = false;
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

  private syncMarkerFromInputs(): void {
    if (!this.map) {
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
      this.marker = L.marker(latlng, { draggable: true }).addTo(this.map);
      this.marker.on('dragend', () => {
        const position = this.marker!.getLatLng();
        this.updateForm(position.lat, position.lng);
      });
    }

    this.map.setView(latlng, Math.max(this.map.getZoom(), 13));
  }

  private onCountryChanged(): void {
    if (!this.map) {
      return;
    }

    const code = this.getCountryCode();
    if (code === this.lastCountryCode) {
      this.refreshMapSize();
      return;
    }

    this.lastCountryCode = code;
    const view = this.getMapView();

    this.refreshMapSize();

    setTimeout(() => {
      this.map?.setView([view.lat, view.lng], view.zoom);
      this.refreshMapSize();
    }, 100);

    this.removeMarker();
    this.clearCoordinates();
  }

  private placeMarker(lat: number, lng: number): void {
    if (!this.map) {
      return;
    }

    const latlng = L.latLng(lat, lng);

    if (this.marker) {
      this.marker.setLatLng(latlng);
    } else {
      this.marker = L.marker(latlng, { draggable: true }).addTo(this.map);
      this.marker.on('dragend', () => {
        const position = this.marker!.getLatLng();
        this.updateForm(position.lat, position.lng);
      });
    }

    this.map.setView(latlng, Math.max(this.map.getZoom(), 13));
    this.updateForm(lat, lng);
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
      return { lat: coords.lat, lng: coords.lng, zoom: 13 };
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
    return String(this.countryCodeControl.value ?? '').trim().toUpperCase();
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
