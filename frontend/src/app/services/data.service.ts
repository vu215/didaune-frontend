import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { Database, Place, Category, City, District } from '../models/app.models';

@Injectable({
  providedIn: 'root',
})
export class DataService {
  private http = inject(HttpClient);
  private dataUrl = 'assets/data/db.json';

  // Global Sync State
  currentCityId = signal('hcm');
  currentDistrictId = signal('all');
  searchQuery = signal('');
  selectedCategoryId = signal('all');

  getDb(): Observable<Database> {
    return this.http.get<Database>(this.dataUrl);
  }

  getPlaces(): Observable<Place[]> {
    return this.getDb().pipe(map((db) => db.places));
  }

  getHotPlaces(): Observable<Place[]> {
    return this.getPlaces().pipe(
      map((places) => places.filter((p) => p.is_hot))
    );
  }

  getCategories(): Observable<Category[]> {
    return this.getDb().pipe(map((db) => db.categories));
  }

  getCities(): Observable<City[]> {
    return this.getDb().pipe(map((db) => db.cities));
  }

  getDistricts(): Observable<District[]> {
    return this.getDb().pipe(map((db) => db.districts));
  }

  getDistrictsByCity(cityId: string): Observable<District[]> {
    return this.getDistricts().pipe(
      map((districts) => districts.filter((d) => d.city_id === cityId))
    );
  }

  getPlaceBySlug(slug: string): Observable<Place | undefined> {
    return this.getPlaces().pipe(
      map((places) => places.find((p) => p.slug === slug))
    );
  }
}
