import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Place } from '../../core/models/app.models';
import { DataService } from '../../core/services/data.service';

@Component({
  selector: 'app-map-page',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './map-page.html',
  styleUrl: './map-page.css',
})
export class MapPage {
  public dataService = inject(DataService);

  places = signal<Place[]>([]);

  filteredPlaces = computed(() =>
    this.places().filter((place) => place.city_id === this.dataService.currentCityId())
  );

  mapPoints = computed(() => {
    const places = this.filteredPlaces().filter(
      (place) => place.latitude !== undefined && place.longitude !== undefined
    );

    if (!places.length) {
      return [];
    }

    const latitudes = places.map((place) => place.latitude as number);
    const longitudes = places.map((place) => place.longitude as number);
    const minLat = Math.min(...latitudes);
    const maxLat = Math.max(...latitudes);
    const minLng = Math.min(...longitudes);
    const maxLng = Math.max(...longitudes);

    return places.map((place) => ({
      ...place,
      x: ((place.longitude as number) - minLng) / Math.max(maxLng - minLng, 0.001),
      y: ((place.latitude as number) - minLat) / Math.max(maxLat - minLat, 0.001),
    }));
  });

  constructor() {
    this.dataService.getPlaces().subscribe((places) => this.places.set(places));
  }
}
