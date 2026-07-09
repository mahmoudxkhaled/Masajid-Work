import { AfterViewInit, Component, ElementRef, EventEmitter, Input, OnDestroy, Output, ViewChild } from '@angular/core';
import * as L from 'leaflet';

@Component({
  standalone: false,
  selector: 'app-donation-location-map-dialog',
  templateUrl: './donation-location-map-dialog.component.html',
  styleUrl: './donation-location-map-dialog.component.scss',
})
export class DonationLocationMapDialogComponent implements AfterViewInit, OnDestroy {
  @ViewChild('map') mapElement?: ElementRef<HTMLDivElement>;

  @Input() visible = false;
  @Output() visibleChange = new EventEmitter<boolean>();

  @Input() latitude = 0;
  @Input() longitude = 0;

  mapLoading = true;

  private map?: L.Map;
  private marker?: L.Marker;
  private destroyed = false;

  ngAfterViewInit(): void {
    this.fixLeafletIcons();
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.destroyMap();
  }

  onDialogShow(): void {
    setTimeout(() => {
      if (!this.destroyed && this.visible) {
        this.initMap();
      }
    }, 150);
  }

  onDialogHide(): void {
    this.visibleChange.emit(false);
    this.mapLoading = true;
    this.destroyMap();
  }

  closeDialog(): void {
    this.visible = false;
    this.visibleChange.emit(false);
    this.mapLoading = true;
    this.destroyMap();
  }

  private initMap(): void {
    const element = this.mapElement?.nativeElement;
    if (!element) {
      this.mapLoading = false;
      return;
    }

    this.destroyMap();

    const lat = this.latitude;
    const lng = this.longitude;

    this.map = L.map(element, {
      attributionControl: false,
      dragging: true,
      scrollWheelZoom: true,
      doubleClickZoom: true,
      zoomControl: true,
    }).setView([lat, lng], 15);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(this.map);

    this.marker = L.marker([lat, lng]).addTo(this.map);

    setTimeout(() => {
      this.map?.invalidateSize();
      this.mapLoading = false;
    }, 100);
  }

  private destroyMap(): void {
    if (this.map) {
      this.map.off();
      this.map.remove();
      this.map = undefined;
    }
    this.marker = undefined;
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
