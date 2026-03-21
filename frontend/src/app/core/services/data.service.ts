import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of, shareReplay } from 'rxjs';
import {
  Category,
  City,
  Database,
  District,
  Place,
  Ward,
} from '../models/app.models';
import { PROVINCE_MAPPINGS } from '../config/location-api.config';

interface ApiProvince {
  code: number;
  name: string;
  wards?: Ward[];
}

@Injectable({
  providedIn: 'root',
})
export class DataService {
  private http = inject(HttpClient);
  private dataUrl = 'assets/data/db.json';
  private provinceApiUrl = 'https://provinces.open-api.vn/api/v2/';

  currentCityId = signal('hcm');
  currentDistrictId = signal('all');
  currentWardCode = signal('');
  searchQuery = signal('');
  selectedCategoryId = signal('all');

  private db$ = this.http.get<Database>(this.dataUrl).pipe(shareReplay(1));
  private cities$ = this.http.get<ApiProvince[]>(this.provinceApiUrl).pipe(
    map((provinces) => {
      const provinceMap = new Map(
        provinces.map((province) => [province.code, province])
      );

      return PROVINCE_MAPPINGS
        .slice()
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((mapping) => {
          const province = provinceMap.get(mapping.provinceCode);

          return province
            ? {
                id: mapping.id,
                name: province.name,
              }
            : null;
        })
        .filter((city): city is City => city !== null);
    }),
    catchError(() => this.db$.pipe(map((db) => db.cities))),
    shareReplay(1)
  );

  getDb(): Observable<Database> {
    return this.db$;
  }

  getPlaces(): Observable<Place[]> {
    return this.getDb().pipe(map((db) => db.places));
  }

  getHotPlaces(): Observable<Place[]> {
    return this.getPlaces().pipe(
      map((places) => places.filter((place) => place.is_hot))
    );
  }

  getCategories(): Observable<Category[]> {
    return this.getDb().pipe(map((db) => db.categories));
  }

  getCities(): Observable<City[]> {
    return this.cities$;
  }

  getWardsByCityId(cityId: string): Observable<Ward[]> {
    const provinceCode = this.getProvinceCodeByCityId(cityId);

    if (!provinceCode) {
      return of([]);
    }

    return this.http
      .get<ApiProvince>(`${this.provinceApiUrl}p/${provinceCode}?depth=2`)
      .pipe(
        map((province) => province.wards ?? []),
        catchError(() => of([]))
      );
  }

  getDistricts(): Observable<District[]> {
    // The current place dataset still uses legacy local district IDs.
    return this.getDb().pipe(map((db) => db.districts));
  }

  getDistrictsByCity(cityId: string): Observable<District[]> {
    return this.getDistricts().pipe(
      map((districts) =>
        districts.filter((district) => district.city_id === cityId)
      )
    );
  }

  getPlaceBySlug(slug: string): Observable<Place | undefined> {
    return this.getPlaces().pipe(
      map((places) => places.find((place) => place.slug === slug))
    );
  }

  private getProvinceCodeByCityId(cityId: string): number | undefined {
    return PROVINCE_MAPPINGS.find((mapping) => mapping.id === cityId)?.provinceCode;
  }
}
