import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, combineLatest, map, of, shareReplay } from 'rxjs';
import {
  Amenity,
  Category,
  City,
  Database,
  District,
  ExternalLocation,
  Place,
  PlaceReview,
  User,
  Ward,
} from '../models/app.models';
import { PROVINCE_MAPPINGS } from '../config/location-api.config';

interface ApiProvince {
  code: number;
  name: string;
  wards?: Ward[];
}

const CATEGORY_CONFIG: Category[] = [
  { id: 'cafe', name: 'Ca phe', icon: 'fa-mug-hot', color: 'text-primary' },
  { id: 'date', name: 'Hen ho', icon: 'fa-heart', color: 'text-rose-500' },
  { id: 'group', name: 'Tu tap', icon: 'fa-users', color: 'text-blue-500' },
  { id: 'work', name: 'Lam viec', icon: 'fa-laptop-code', color: 'text-emerald-500' },
  { id: 'photo', name: 'Song ao', icon: 'fa-camera', color: 'text-violet-500' },
];

const AMENITY_CONFIG: Amenity[] = [
  { id: 'late', name: 'Mo toi', icon: 'fa-clock' },
  { id: 'parking', name: 'De gui xe', icon: 'fa-car' },
  { id: 'quiet', name: 'Yen tinh', icon: 'fa-volume-low' },
  { id: 'wifi', name: 'Wifi tot', icon: 'fa-wifi' },
  { id: 'music', name: 'Co nhac', icon: 'fa-music' },
  { id: 'outdoor', name: 'Cho ngoi ngoai troi', icon: 'fa-tree' },
];

const DEFAULT_USER: User = {
  id: 'local-user',
  name: 'Ban',
  email: 'ban@didaune.local',
  avatar: 'https://ui-avatars.com/api/?name=Ban&background=f97316&color=fff&size=128',
  bio: 'Nguoi kham pha nhung quan cafe va dia diem hay ho trong thanh pho.',
  membership: 'Explorer',
  points: 1200,
};

type StoredReviewDraft = Pick<PlaceReview, 'place_slug' | 'rating' | 'comment' | 'images'>;

@Injectable({
  providedIn: 'root',
})
export class DataService {
  private http = inject(HttpClient);
  private dataUrl = 'assets/data/db.json';
  private externalDataUrl = 'cafe-in-ho-chi-minh-city-ho-chi-minh-city-vietnam.json';
  private provinceApiUrl = 'https://provinces.open-api.vn/api/v2/';
  private favoritesStorageKey = 'didaune_favorites';
  private reviewsStorageKey = 'didaune_reviews';
  private userStorageKey = 'didaune_user';

  currentCityId = signal('hcm');
  currentDistrictId = signal('all');
  currentWardCode = signal('');
  currentWardName = signal('');
  searchQuery = signal('');
  selectedCategoryId = signal('all');
  selectedAmenityId = signal('all');
  sortOption = signal<'popular' | 'rating' | 'name' | 'new'>('popular');

  favoriteSlugs = signal<string[]>(this.readStorage<string[]>(this.favoritesStorageKey, []));
  internalReviews = signal<PlaceReview[]>(
    this.readStorage<PlaceReview[]>(this.reviewsStorageKey, [])
  );
  currentUser = signal<User>(this.readStorage<User>(this.userStorageKey, DEFAULT_USER));

  private db$ = this.http.get<Database>(this.dataUrl).pipe(shareReplay(1));
  private externalLocations$ = this.http
    .get<ExternalLocation[]>(this.externalDataUrl)
    .pipe(shareReplay(1));

  private categories$ = of(CATEGORY_CONFIG).pipe(shareReplay(1));
  private amenities$ = of(AMENITY_CONFIG).pipe(shareReplay(1));

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

  private places$ = combineLatest([
    this.externalLocations$,
    this.categories$,
    this.amenities$,
  ]).pipe(
    map(([locations, categories, amenities]) =>
      locations.map((location, index, source) =>
        this.normalizeLocation(location, index, source.length, categories, amenities)
      )
    ),
    catchError(() =>
      this.db$.pipe(
        map((db) =>
          db.places.map((place) => ({
            ...place,
            id: String(place.id),
            area_id: this.slugify(place.address),
            area_name: place.address,
            district_name: place.address,
            ward_name: '',
            city_name: db.cities.find((city) => city.id === place.city_id)?.name ?? '',
            gallery: [{ id: `${place.slug}-cover`, url: place.image }],
            category_labels: place.categories,
            source_categories: place.categories,
            amenity_labels: place.amenities,
            description: place.name,
            status: 'Dang mo cua',
            phone: null,
            website: null,
            google_maps_link: null,
            menu_link: null,
            reservations_link: null,
            latitude: undefined,
            longitude: undefined,
            hours: [],
            highlights: [],
            owner_name: null,
            owner_posts: [],
            competitors: [],
            reviews: [],
            can_claim: false,
            is_temporarily_closed: false,
            is_permanently_closed: false,
          }))
        )
      )
    ),
    shareReplay(1)
  );

  private districts$ = combineLatest([this.places$, this.db$]).pipe(
    map(([places, db]) => {
      const derived = places.map((place) => ({
        id: place.district_id,
        city_id: place.city_id,
        name: place.district_name,
      }));

      return this.uniqueDistricts([...db.districts, ...derived]);
    }),
    shareReplay(1)
  );

  getDb(): Observable<Database> {
    return this.db$;
  }

  getPlaces(): Observable<Place[]> {
    return this.places$;
  }

  getHotPlaces(): Observable<Place[]> {
    return this.getPlaces().pipe(
      map((places) => [...places].filter((place) => place.is_hot).slice(0, 6))
    );
  }

  getCategories(): Observable<Category[]> {
    return this.categories$;
  }

  getAmenities(): Observable<Amenity[]> {
    return this.amenities$;
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
    return this.districts$;
  }

  getAreaOptions(): Observable<District[]> {
    return this.getPlaces().pipe(
      map((places) =>
        this.uniqueDistricts(
          places.map((place) => ({
            id: place.area_id,
            city_id: place.city_id,
            name: place.area_name,
          }))
        )
      ),
      shareReplay(1)
    );
  }

  getDistrictsByCity(cityId: string): Observable<District[]> {
    return this.getDistricts().pipe(
      map((districts) => districts.filter((district) => district.city_id === cityId))
    );
  }

  getPlaceBySlug(slug: string): Observable<Place | undefined> {
    return this.getPlaces().pipe(
      map((places) => places.find((place) => place.slug === slug))
    );
  }

  getRelatedPlaces(place: Place): Observable<Place[]> {
    return this.getPlaces().pipe(
      map((places) =>
        places
          .filter(
            (candidate) =>
              candidate.slug !== place.slug &&
              (candidate.district_id === place.district_id ||
                candidate.categories.some((category) => place.categories.includes(category)))
          )
          .slice(0, 4)
      )
    );
  }

  getReviewsByPlaceSlug(slug: string): Observable<PlaceReview[]> {
    return this.getPlaceBySlug(slug).pipe(
      map((place) => {
        if (!place) {
          return [];
        }

        const saved = this.internalReviews().filter((review) => review.place_slug === slug);
        return [...saved, ...place.reviews].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      })
    );
  }

  getFavoritePlaces(): Observable<Place[]> {
    return this.getPlaces().pipe(
      map((places) => places.filter((place) => this.favoriteSlugs().includes(place.slug)))
    );
  }

  toggleFavorite(slug: string) {
    const next = this.favoriteSlugs().includes(slug)
      ? this.favoriteSlugs().filter((item) => item !== slug)
      : [...this.favoriteSlugs(), slug];

    this.favoriteSlugs.set(next);
    this.writeStorage(this.favoritesStorageKey, next);
  }

  isFavorite(slug: string): boolean {
    return this.favoriteSlugs().includes(slug);
  }

  submitReview(review: StoredReviewDraft) {
    const currentUser = this.currentUser();
    const nextReview: PlaceReview = {
      id: `local-${Date.now()}`,
      place_slug: review.place_slug,
      source: 'internal',
      user_name: currentUser.name,
      avatar: currentUser.avatar,
      rating: review.rating,
      comment: review.comment,
      created_at: new Date().toISOString(),
      images: review.images,
      reviewer_profile: null,
      is_local_guide: false,
    };

    const nextReviews = [nextReview, ...this.internalReviews()];
    this.internalReviews.set(nextReviews);
    this.writeStorage(this.reviewsStorageKey, nextReviews);
  }

  upsertCurrentUser(user: Partial<User>) {
    const nextUser: User = {
      ...this.currentUser(),
      ...user,
      id: user.id ?? this.currentUser().id,
      name: user.name?.trim() || this.currentUser().name,
      email: user.email?.trim() || this.currentUser().email,
    };

    this.currentUser.set(nextUser);
    this.writeStorage(this.userStorageKey, nextUser);
  }

  getCategoryLabel(categoryId: string): string {
    return CATEGORY_CONFIG.find((category) => category.id === categoryId)?.name ?? categoryId;
  }

  getAmenityLabel(amenityId: string): string {
    return AMENITY_CONFIG.find((amenity) => amenity.id === amenityId)?.name ?? amenityId;
  }

  resetFilters() {
    this.currentDistrictId.set('all');
    this.currentWardCode.set('');
    this.currentWardName.set('');
    this.selectedCategoryId.set('all');
    this.selectedAmenityId.set('all');
    this.sortOption.set('popular');
  }

  private normalizeLocation(
    location: ExternalLocation,
    index: number,
    totalCount: number,
    categories: Category[],
    amenities: Amenity[]
  ): Place {
    const districtName = this.extractDistrictName(location);
    const areaName = this.normalizeAdministrativeLabel(
      location.detailed_address?.ward?.trim() || districtName || 'Khu vuc khac'
    );
    const districtLabel = this.normalizeAdministrativeLabel(districtName || 'Ho Chi Minh');
    const categoryIds = this.mapCategories(location, categories);
    const amenityIds = this.mapAmenities(location, amenities);
    const images = [
      ...(location.featured_images ?? []),
      ...(location.images ?? []),
      ...(location.featured_image ? [location.featured_image] : []),
    ].filter((image, imageIndex, array) => Boolean(image) && array.indexOf(image) === imageIndex);
    const gallery = images.map((image, imageIndex) => ({
      id: `${location.place_id}-${imageIndex}`,
      url: image,
    }));
    const reviews = this.mapExternalReviews(location);
    const reviewCount = location.reviews ?? reviews.length;
    const score = (location.rating ?? 0) * 100 + reviewCount;
    const hotThreshold = Math.max(3, Math.floor(totalCount * 0.4));
    const isHot = index < hotThreshold || score >= 420;

    return {
      id: location.place_id,
      name: location.name,
      slug: this.slugify(location.name),
      city_id: 'hcm',
      area_id: this.slugify(areaName),
      area_name: areaName,
      district_id: this.slugify(districtName || 'ho-chi-minh'),
      district_name: districtLabel,
      ward_name: areaName,
      city_name: this.normalizeAdministrativeLabel(
        location.detailed_address?.city?.trim() ?? 'Ho Chi Minh'
      ),
      address: location.address?.trim() ?? location.name,
      image: images[0] ?? 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&q=80&w=1200',
      gallery,
      rating: location.rating ?? 0,
      review_count: reviewCount,
      price_range: this.normalizePriceRange(location.price_range),
      categories: categoryIds,
      category_labels: categoryIds.map((categoryId) => this.getCategoryLabel(categoryId)),
      source_categories: location.categories ?? [],
      amenities: amenityIds,
      amenity_labels: amenityIds.map((amenityId) => this.getAmenityLabel(amenityId)),
      is_hot: isHot,
      is_new: (location.owner_posts?.length ?? 0) > 0,
      description: this.normalizeDescription(location.description, location.name),
      status: this.buildStatus(location),
      phone: location.phone ?? null,
      website: location.website ?? null,
      google_maps_link: location.link ?? null,
      menu_link: location.menu?.link ?? null,
      reservations_link: location.reservations?.link ?? null,
      latitude: location.coordinates?.latitude,
      longitude: location.coordinates?.longitude,
      hours: location.hours ?? [],
      highlights: this.buildHighlights(location),
      owner_name: location.owner?.name ?? null,
      owner_posts: (location.owner_posts ?? []).slice(0, 3).map((post, postIndex) => ({
        id: post.post_id ?? `${location.place_id}-post-${postIndex}`,
        text: post.post_text ?? null,
        link: post.link ?? null,
        published_at: post.published_at ?? null,
        image: post.images?.[0] ?? null,
      })),
      competitors: (location.competitors ?? []).slice(0, 4).map((competitor) => ({
        name: competitor.name,
        suggested_link: competitor.suggested_link,
        reviews: competitor.reviews,
        rating: competitor.rating,
        main_category: competitor.main_category,
        latitude: competitor.coordinates?.latitude,
        longitude: competitor.coordinates?.longitude,
      })),
      reviews,
      can_claim: Boolean(location.can_claim),
      is_temporarily_closed: Boolean(location.is_temporarily_closed),
      is_permanently_closed: Boolean(location.is_permanently_closed),
    };
  }

  private mapExternalReviews(location: ExternalLocation): PlaceReview[] {
    const reviews = [...(location.detailed_reviews ?? []), ...(location.featured_reviews ?? [])];
    const seenIds = new Set<string>();

    return reviews
      .filter((review) => {
        if (seenIds.has(review.review_id)) {
          return false;
        }

        seenIds.add(review.review_id);
        return true;
      })
      .slice(0, 8)
      .map((review) => ({
        id: review.review_id,
        place_slug: this.slugify(location.name),
        source: 'external',
        user_name: review.name,
        avatar:
          review.avatar_link ??
          `https://ui-avatars.com/api/?name=${encodeURIComponent(review.name)}&background=e2e8f0&color=0f172a`,
        rating: review.rating,
        comment: review.review_text?.trim() ?? 'Khach hang chua de lai noi dung.',
        created_at: review.published_at_date ?? new Date().toISOString(),
        images: (review.review_photos ?? []).slice(0, 4).map((photo) => photo.url),
        reviewer_profile: review.reviewer_profile ?? null,
        is_local_guide: review.is_local_guide ?? false,
      }));
  }

  private mapCategories(location: ExternalLocation, categories: Category[]): string[] {
    const source = `${location.main_category ?? ''} ${(location.categories ?? []).join(' ')} ${
      location.description ?? ''
    }`.toLowerCase();
    const categoryIds = new Set<string>(['cafe']);

    if (source.includes('bar') || source.includes('lounge') || source.includes('restaurant')) {
      categoryIds.add('date');
      categoryIds.add('group');
    }

    if (
      source.includes('art') ||
      source.includes('view') ||
      source.includes('dog') ||
      source.includes('koi') ||
      source.includes('decor')
    ) {
      categoryIds.add('photo');
    }

    if (
      source.includes('quiet') ||
      source.includes('study') ||
      source.includes('work') ||
      source.includes('espresso')
    ) {
      categoryIds.add('work');
    }

    if (source.includes('beer') || source.includes('group') || source.includes('pub')) {
      categoryIds.add('group');
    }

    if (source.includes('romantic') || source.includes('atmosphere')) {
      categoryIds.add('date');
    }

    return categories
      .map((category) => category.id)
      .filter((categoryId) => categoryIds.has(categoryId));
  }

  private mapAmenities(location: ExternalLocation, amenities: Amenity[]): string[] {
    const source = `${location.description ?? ''} ${(location.categories ?? []).join(' ')} ${
      location.review_keywords?.map((keyword) => keyword.keyword).join(' ') ?? ''
    }`.toLowerCase();
    const amenityIds = new Set<string>();

    if (source.includes('wifi')) {
      amenityIds.add('wifi');
    }

    if (
      source.includes('quiet') ||
      source.includes('yen tinh') ||
      source.includes('work')
    ) {
      amenityIds.add('quiet');
    }

    if (source.includes('music') || source.includes('beer') || source.includes('acoustic')) {
      amenityIds.add('music');
    }

    if (source.includes('outdoor') || source.includes('terrace') || source.includes('koi')) {
      amenityIds.add('outdoor');
    }

    if (source.includes('parking') || source.includes('airport') || source.includes('car')) {
      amenityIds.add('parking');
    }

    if (location.hours?.some((hour) => hour.times.some((time) => time.includes('23:00')))) {
      amenityIds.add('late');
    }

    return amenities
      .map((amenity) => amenity.id)
      .filter((amenityId) => amenityIds.has(amenityId));
  }

  private buildHighlights(location: ExternalLocation): string[] {
    const keywordHighlights = (location.review_keywords ?? [])
      .slice(0, 5)
      .map((keyword) => keyword.keyword.replace(/_/g, ' '));
    const categoryHighlights = (location.categories ?? []).slice(0, 3);
    const combined = [...keywordHighlights, ...categoryHighlights].filter(Boolean);

    return [...new Set(combined)].slice(0, 6);
  }

  private normalizeDescription(description: string | null | undefined, name: string): string {
    if (description?.trim()) {
      return description.trim().replace(/\s+/g, ' ');
    }

    return `${name} la mot dia diem dang duoc cong dong quan tam, phu hop de cafe, hen ho va kham pha khong gian moi.`;
  }

  private buildStatus(location: ExternalLocation): string {
    if (location.is_permanently_closed) {
      return 'Da dong cua';
    }

    if (location.is_temporarily_closed) {
      return 'Tam dong cua';
    }

    return location.status?.trim() || 'Dang mo cua';
  }

  private normalizePriceRange(priceRange: string | null | undefined): string {
    if (!priceRange?.trim()) {
      return 'Dang cap nhat';
    }

    return priceRange.replace(/N D/g, 'VND').replace(/\s+/g, ' ').trim();
  }

  private extractDistrictName(location: ExternalLocation): string {
    return (
      location.detailed_address?.state?.trim() ||
      location.detailed_address?.ward?.trim() ||
      location.address?.split(',').slice(-2, -1)[0]?.trim() ||
      'Ho Chi Minh'
    );
  }

  private normalizeAdministrativeLabel(value: string): string {
    return value
      .replace(/\bPhuong\b/gi, 'Phường')
      .replace(/\bQuan\b/gi, 'Quận')
      .replace(/\bWard\b/gi, 'Phường')
      .replace(/\bDistrict\b/gi, 'Quận')
      .replace(/\bThanh pho Ho Chi Minh\b/gi, 'TP. Hồ Chí Minh')
      .replace(/\bHo Chi Minh City\b/gi, 'TP. Hồ Chí Minh')
      .replace(/\bHo Chi Minh\b/gi, 'TP. Hồ Chí Minh')
      .replace(/\bTan Binh\b/gi, 'Tân Bình')
      .replace(/\bGo Vap\b/gi, 'Gò Vấp')
      .replace(/\bPhu Nhuan\b/gi, 'Phú Nhuận')
      .replace(/\bBen Thanh\b/gi, 'Bến Thành')
      .replace(/\bTan Dinh\b/gi, 'Tân Định')
      .replace(/\bVo Thi Sau\b/gi, 'Võ Thị Sáu')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private uniqueDistricts(districts: District[]): District[] {
    const mapById = new Map<string, District>();

    for (const district of districts) {
      mapById.set(district.id, district);
    }

    return [...mapById.values()].sort((a, b) => a.name.localeCompare(b.name));
  }

  private slugify(value: string): string {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private readStorage<T>(key: string, fallback: T): T {
    if (typeof window === 'undefined') {
      return fallback;
    }

    const value = window.localStorage.getItem(key);

    if (!value) {
      return fallback;
    }

    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }

  private writeStorage<T>(key: string, value: T) {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(key, JSON.stringify(value));
  }

  private getProvinceCodeByCityId(cityId: string): number | undefined {
    return PROVINCE_MAPPINGS.find((mapping) => mapping.id === cityId)?.provinceCode;
  }
}
