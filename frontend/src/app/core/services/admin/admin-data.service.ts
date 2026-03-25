import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, Subject, combineLatest, map, shareReplay, startWith, switchMap, tap } from 'rxjs';
import { BACKEND_API_CONFIG } from '../../config/backend-api.config';
import { Place, PlaceReview } from '../../models/app.models';
import { DataService } from '../data.service';
import { PlaceMapperService, BackendLocation } from '../place-mapper.service';
import { AdminAuthService } from './admin-auth.service';

export interface AdminKpi {
  label: string;
  value: string;
  delta: string;
  tone: string;
}

export interface AdminLocationRow {
  place: Place;
  status: 'published' | 'needs_review' | 'draft';
  completeness: number;
}

export interface AdminUserRow {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'moderator' | 'content_admin' | 'super_admin';
  reviews: number;
  favorites: number;
  status: 'active' | 'flagged';
}

export interface AdminPartnerRow {
  id: string;
  placeName: string;
  ownerName: string;
  district: string;
  status: 'pending' | 'verified' | 'rejected' | 'active';
  source: string;
}

export interface AdminImportBatch {
  id: string;
  source: string;
  importedAt: string;
  records: number;
  status: 'completed' | 'review' | 'failed';
  issues: number;
}

export interface AdminTaxonomyRow {
  id: string;
  name: string;
  type: 'category' | 'amenity' | 'collection_tag';
  usage: number;
  accent: string;
}

export interface AdminCollectionRow {
  id: string;
  title: string;
  count: number;
  theme: string;
  status: 'published' | 'draft';
}

export interface AdminReportRow {
  id: string;
  title: string;
  count: number;
  severity: 'high' | 'medium' | 'low';
  description: string;
}

export interface AdminReviewRow {
  review: PlaceReview;
  placeName: string;
  moderationStatus: 'approved' | 'pending' | 'flagged';
}

interface BackendApiEnvelope<T> {
  success: boolean;
  message?: string;
  data: T;
}

interface BackendPaginated<T> {
  data: T[];
}

interface BackendAdminReview {
  id: string;
  reviewer_name: string | null;
  reviewer_avatar_url?: string | null;
  reviewer_profile?: string | null;
  rating: number | null;
  review_text: string | null;
  published_at: string | null;
  review_source?: 'external' | 'internal' | string;
  moderation_status: 'approved' | 'pending' | 'flagged';
  raw_payload?: { images?: string[] } | null;
  location?: { name?: string; slug?: string | null } | null;
}

interface BackendAdminUser {
  id: number | string;
  name: string;
  email: string;
  role?: string | null;
  is_active?: boolean | null;
  favorites_count?: number;
  location_reviews_count?: number;
}

@Injectable({
  providedIn: 'root',
})
export class AdminDataService {
  private http = inject(HttpClient);
  private auth = inject(AdminAuthService);
  private dataService = inject(DataService);
  private mapper = inject(PlaceMapperService);
  private apiBaseUrl = BACKEND_API_CONFIG.baseUrl;
  private refreshLocations$ = new Subject<void>();
  private refreshReviews$ = new Subject<void>();
  private refreshUsers$ = new Subject<void>();
  private refreshPartners$ = new Subject<void>();
  private refreshImports$ = new Subject<void>();
  private refreshCollections$ = new Subject<void>();

  readonly kpis$: Observable<AdminKpi[]> = combineLatest([
    this.getAdminLocations(),
    this.getAdminUsers(),
    this.getAdminReviews(),
    this.getPartnerRequests(),
  ]).pipe(
    map(([locations, users, reviews, partners]) => [
      {
        label: 'Địa điểm đang live',
        value: String(locations.filter((row) => row.status === 'published').length),
        delta: `+${locations.filter((row) => row.status === 'draft').length} nháp`,
        tone: 'from-orange-500 to-rose-500',
      },
      {
        label: 'Người dùng',
        value: String(users.length),
        delta: `${users.filter((user) => user.status === 'flagged').length} cần xem`,
        tone: 'from-sky-500 to-cyan-500',
      },
      {
        label: 'Đánh giá mới',
        value: String(reviews.filter((review) => review.moderationStatus === 'pending').length),
        delta: `+${reviews.filter((review) => review.moderationStatus === 'pending').length}`,
        tone: 'from-emerald-500 to-teal-500',
      },
      {
        label: 'Yêu cầu Partner',
        value: String(partners.length),
        delta: `${partners.filter((partner) => partner.status === 'pending').length} chờ duyệt`,
        tone: 'from-violet-500 to-fuchsia-500',
      },
    ]),
    shareReplay(1)
  );

  getAdminLocations(): Observable<AdminLocationRow[]> {
    return this.refreshLocations$.pipe(
      startWith(void 0),
      switchMap(() =>
        this.http.get<BackendApiEnvelope<BackendPaginated<BackendLocation>>>(
          `${this.apiBaseUrl}/locations`,
          {
            headers: this.auth.authHeaders(),
            params: new HttpParams().set('per_page', '50'),
          }
        )
      ),
      map((response) =>
        response.data.data.map((location, index, source) => {
          const place = this.mapper.normalizeBackendLocation(location, index, source.length);
          const completeness = this.calculateCompleteness(place);

          return {
            place,
            completeness,
            status: place.listing_status ?? (completeness < 70 ? 'needs_review' : 'published'),
          } satisfies AdminLocationRow;
        })
      ),
      shareReplay(1)
    );
  }

  getLocationBySlug(slug: string): Observable<AdminLocationRow | undefined> {
    return this.getAdminLocations().pipe(
      map((rows) => rows.find((row) => row.place.slug === slug))
    );
  }

  getAdminReviews(): Observable<AdminReviewRow[]> {
    return this.refreshReviews$.pipe(
      startWith(void 0),
      switchMap(() =>
        this.http.get<BackendApiEnvelope<BackendPaginated<BackendAdminReview>>>(
          `${this.apiBaseUrl}/reviews`,
          {
            headers: this.auth.authHeaders(),
            params: new HttpParams().set('per_page', '50'),
          }
        )
      ),
      map((response) =>
        response.data.data.map((review) => ({
          review: {
            id: String(review.id),
            place_slug: review.location?.slug ?? '',
            source: (review.review_source === 'internal' ? 'internal' : 'external') as
              | 'internal'
              | 'external',
            user_name: review.reviewer_name ?? 'Khach hang',
            avatar:
              review.reviewer_avatar_url ??
              `https://ui-avatars.com/api/?name=${encodeURIComponent(
                review.reviewer_name ?? 'Khach'
              )}&background=e2e8f0&color=0f172a`,
            rating: Number(review.rating ?? 0),
            comment: review.review_text ?? '',
            created_at: review.published_at ?? new Date().toISOString(),
            images: review.raw_payload?.images ?? [],
            reviewer_profile: review.reviewer_profile ?? null,
            moderation_status: review.moderation_status,
          },
          placeName: review.location?.name ?? 'Khong ro',
          moderationStatus: review.moderation_status,
        }))
      ),
      shareReplay(1)
    );
  }

  getAdminUsers(): Observable<AdminUserRow[]> {
    return this.refreshUsers$.pipe(
      startWith(void 0),
      switchMap(() =>
        this.http.get<BackendApiEnvelope<BackendPaginated<BackendAdminUser>>>(
          `${this.apiBaseUrl}/users`,
          {
            headers: this.auth.authHeaders(),
            params: new HttpParams().set('per_page', '50'),
          }
        )
      ),
      map((response) =>
        response.data.data.map((user) => ({
          id: String(user.id),
          name: user.name,
          email: user.email,
          role: (user.role as AdminUserRow['role']) || 'user',
          reviews: user.location_reviews_count ?? 0,
          favorites: user.favorites_count ?? 0,
          status: (user.is_active === false ? 'flagged' : 'active') as
            | 'flagged'
            | 'active',
        }))
      ),
      shareReplay(1)
    );
  }

  getPartnerRequests(): Observable<AdminPartnerRow[]> {
    return this.refreshPartners$.pipe(
      startWith(void 0),
      switchMap(() =>
        this.http.get<BackendApiEnvelope<AdminPartnerRow[]>>(`${this.apiBaseUrl}/admin/partners`, {
          headers: this.auth.authHeaders(),
        })
      ),
      map((response) => response.data),
      shareReplay(1)
    );
  }

  getImportBatches(): Observable<AdminImportBatch[]> {
    return this.refreshImports$.pipe(
      startWith(void 0),
      switchMap(() =>
        this.http.get<BackendApiEnvelope<any[]>>(`${this.apiBaseUrl}/admin/imports`, {
          headers: this.auth.authHeaders(),
        })
      ),
      map((response) =>
        response.data.map((row) => ({
          id: row.id,
          source: row.source,
          importedAt: row.imported_at,
          records: row.records,
          status: row.status,
          issues: row.issues,
        }))
      ),
      shareReplay(1)
    );
  }

  getTaxonomyRows(): Observable<AdminTaxonomyRow[]> {
    return combineLatest([
      this.dataService.getCategories(),
      this.dataService.getAmenities(),
      this.dataService.getPlaces(),
    ]).pipe(
      map(([categories, amenities, places]) => {
        const categoryRows = categories.map((category) => ({
          id: category.id,
          name: category.name,
          type: 'category' as const,
          usage: places.filter((place) => place.categories.includes(category.id)).length,
          accent: category.color,
        }));

        const amenityRows = amenities.map((amenity) => ({
          id: amenity.id,
          name: amenity.name,
          type: 'amenity' as const,
          usage: places.filter((place) => place.amenities.includes(amenity.id)).length,
          accent: 'text-slate-600',
        }));

        const collectionRows: AdminTaxonomyRow[] = [
          {
            id: 'deadline',
            name: 'Cay deadline',
            type: 'collection_tag',
            usage: places.filter((place) => place.categories.includes('work')).length,
            accent: 'text-emerald-500',
          },
          {
            id: 'date-night',
            name: 'Date night',
            type: 'collection_tag',
            usage: places.filter((place) => place.categories.includes('date')).length,
            accent: 'text-rose-500',
          },
        ];

        return [...categoryRows, ...amenityRows, ...collectionRows];
      }),
      shareReplay(1)
    );
  }

  getCollections(): Observable<AdminCollectionRow[]> {
    return this.refreshCollections$.pipe(
      startWith(void 0),
      switchMap(() =>
        this.http.get<BackendApiEnvelope<any[]>>(`${this.apiBaseUrl}/admin/collections`, {
          headers: this.auth.authHeaders(),
        })
      ),
      map((response) =>
        response.data.map((row) => ({
          id: row.id,
          title: row.title,
          count: row.count,
          theme: row.theme,
          status: row.status,
        }))
      ),
      shareReplay(1)
    );
  }

  updateLocationStatus(slug: string, status: AdminLocationRow['status']) {
    this.getLocationBySlug(slug)
      .pipe(
        switchMap((row) =>
          this.http.patch(
            `${this.apiBaseUrl}/locations/${row?.place.id}`,
            { slug, listing_status: status },
            { headers: this.auth.authHeaders() }
          )
        ),
        tap(() => this.refreshLocations$.next())
      )
      .subscribe();
  }

  deleteLocation(slug: string) {
    this.getLocationBySlug(slug)
      .pipe(
        switchMap((row) =>
          this.http.delete(`${this.apiBaseUrl}/locations/${row?.place.id}`, {
            headers: this.auth.authHeaders(),
          })
        ),
        tap(() => this.refreshLocations$.next())
      )
      .subscribe();
  }

  updateLocation(slug: string, partial: Partial<Place>) {
    this.getLocationBySlug(slug)
      .pipe(
        switchMap((row) =>
          this.http.patch(
            `${this.apiBaseUrl}/locations/${row?.place.id}`,
            this.mapPlaceToLocationPayload({
              ...row?.place,
              ...partial,
            }),
            { headers: this.auth.authHeaders() }
          )
        ),
        tap(() => this.refreshLocations$.next())
      )
      .subscribe();
  }

  createLocation(place: Partial<Place>): Observable<Place> {
    return this.http
      .post<BackendApiEnvelope<BackendLocation>>(
        `${this.apiBaseUrl}/locations`,
        this.mapPlaceToLocationPayload(place),
        { headers: this.auth.authHeaders() }
      )
      .pipe(
        map((response) => this.mapper.normalizeBackendLocation(response.data, 0, 1)),
        tap(() => this.refreshLocations$.next())
      );
  }

  getDashboardCharts(): Observable<{ traffic: number[]; vibes: { name: string; value: number }[] }> {
    return this.dataService.getPlaces().pipe(
      map((places) => {
        const traffic = [42, 58, 45, 82, 70, 65, 95];
        const vibeCounts: Record<string, number> = {};

        places.forEach((place) => {
          place.categories.forEach((category) => {
            vibeCounts[category] = (vibeCounts[category] || 0) + 1;
          });
        });

        const vibes = Object.entries(vibeCounts)
          .map(([name, count]) => ({
            name: name.charAt(0).toUpperCase() + name.slice(1),
            value: Math.round((count / Math.max(places.length, 1)) * 100),
          }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 3);

        return { traffic, vibes };
      }),
      shareReplay(1)
    );
  }

  updateReviewStatus(reviewId: string, status: AdminReviewRow['moderationStatus']) {
    this.http
      .patch(
        `${this.apiBaseUrl}/reviews/${reviewId}`,
        { moderation_status: status },
        { headers: this.auth.authHeaders() }
      )
      .pipe(tap(() => this.refreshReviews$.next()))
      .subscribe();
  }

  updatePartnerStatus(id: string, status: AdminPartnerRow['status']) {
    this.http
      .patch(
        `${this.apiBaseUrl}/admin/partners/${id}`,
        { status },
        { headers: this.auth.authHeaders() }
      )
      .pipe(tap(() => this.refreshPartners$.next()))
      .subscribe();
  }

  updateImportStatus(id: string, status: AdminImportBatch['status']) {
    this.http
      .patch(
        `${this.apiBaseUrl}/admin/imports/${id}`,
        { status },
        { headers: this.auth.authHeaders() }
      )
      .pipe(tap(() => this.refreshImports$.next()))
      .subscribe();
  }

  updateCollectionStatus(id: string, status: AdminCollectionRow['status']) {
    this.http
      .patch(
        `${this.apiBaseUrl}/admin/collections/${id}`,
        { status },
        { headers: this.auth.authHeaders() }
      )
      .pipe(tap(() => this.refreshCollections$.next()))
      .subscribe();
  }

  addUser(user: AdminUserRow) {
    this.http
      .post(
        `${this.apiBaseUrl}/users`,
        {
          name: user.name,
          email: user.email,
          password: 'changeme123',
          role: user.role,
          is_active: user.status === 'active',
        },
        { headers: this.auth.authHeaders() }
      )
      .pipe(tap(() => this.refreshUsers$.next()))
      .subscribe();
  }

  updateUser(user: Pick<AdminUserRow, 'id' | 'name' | 'email' | 'role' | 'status'>) {
    this.http
      .patch(
        `${this.apiBaseUrl}/users/${user.id}`,
        {
          name: user.name,
          email: user.email,
          role: user.role,
          is_active: user.status === 'active',
        },
        { headers: this.auth.authHeaders() }
      )
      .pipe(tap(() => this.refreshUsers$.next()))
      .subscribe();
  }

  getReports(): Observable<AdminReportRow[]> {
    return this.getAdminLocations().pipe(
      map((rows) => {
        const places = rows.map((row) => row.place);
        const missingWard = places.filter((place) => !place.area_name).length;
        const missingCoords = places.filter(
          (place) => place.latitude === undefined || place.longitude === undefined
        ).length;
        const lowCompleteness = rows.filter((row) => row.completeness < 70).length;
        const noOwner = places.filter((place) => !place.owner_name).length;

        return [
          {
            id: 'report-ward',
            title: 'Chưa map phường mới',
            count: missingWard,
            severity: missingWard > 0 ? 'high' : 'low',
            description: 'Cần review lại mapping địa giới sau sáp nhập.',
          },
          {
            id: 'report-coords',
            title: 'Thiếu tọa độ',
            count: missingCoords,
            severity: missingCoords > 0 ? 'medium' : 'low',
            description: 'Không thể đưa vào map và spatial join nếu thiếu lat/lng.',
          },
          {
            id: 'report-quality',
            title: 'Hồ sơ địa điểm thiếu dữ liệu',
            count: lowCompleteness,
            severity: lowCompleteness > 2 ? 'high' : 'medium',
            description: 'Cần bổ sung ảnh, số điện thoại, menu link, hoặc owner data.',
          },
          {
            id: 'report-owner',
            title: 'Chưa gán partner',
            count: noOwner,
            severity: 'medium',
            description: 'Những địa điểm này chưa có owner/partner relation rõ ràng.',
          },
        ] satisfies AdminReportRow[];
      }),
      shareReplay(1)
    );
  }

  private calculateCompleteness(place: Place): number {
    const checks = [
      Boolean(place.description),
      Boolean(place.gallery.length),
      Boolean(place.address),
      Boolean(place.area_name),
      Boolean(place.google_maps_link),
      Boolean(place.website),
      Boolean(place.phone),
      Boolean(place.reviews && place.reviews.length),
      Boolean(place.latitude !== undefined && place.longitude !== undefined),
    ];

    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }

  private mapPlaceToLocationPayload(place: Partial<Place>) {
    return {
      name: place.name,
      slug: place.slug,
      description: place.description,
      full_address: place.address,
      ward: place.ward_name,
      district: place.district_name,
      city: place.city_name,
      website: place.website,
      phone: place.phone,
      google_maps_link: place.google_maps_link,
      featured_image: place.image,
      owner_name: place.owner_name,
      latitude: place.latitude,
      longitude: place.longitude,
      listing_status: place.listing_status ?? 'draft',
    };
  }
}
