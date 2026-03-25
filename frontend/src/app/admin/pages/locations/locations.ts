import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { AdminAuthService } from '../../../core/services/admin/admin-auth.service';
import { AdminDataService, AdminLocationRow } from '../../../core/services/admin/admin-data.service';
import { Place } from '../../../core/models/app.models';

@Component({
  selector: 'app-admin-locations',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './locations.html',
})
export class LocationsAdmin {
  private adminData = inject(AdminDataService);
  private router = inject(Router);
  adminAuth = inject(AdminAuthService);

  rows = signal<AdminLocationRow[]>([]);
  query = signal('');
  status = signal<'all' | 'published' | 'needs_review' | 'draft'>('all');

  filteredRows = computed(() => {
    const query = this.query().trim().toLowerCase();
    return this.rows().filter((row) => {
      const matchStatus = this.status() === 'all' || row.status === this.status();
      const searchText = [
        row.place.name,
        row.place.area_name,
        row.place.district_name,
        row.place.description,
      ]
        .join(' ')
        .toLowerCase();
      const matchQuery = !query || searchText.includes(query);

      return matchStatus && matchQuery;
    });
  });

  constructor() {
    this.adminData.getAdminLocations().subscribe((rows) => this.rows.set(rows));
  }

  addNewLocation() {
    const slug = `new-place-${Date.now()}`;
    const newPlace: Partial<Place> = {
      slug,
      name: 'Địa điểm mới',
      description: 'Mô tả sơ lược về địa điểm...',
      image: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&q=80&w=800',
      gallery: [],
      category_labels: ['Cafe'],
      amenity_labels: [],
      address: 'Dang cap nhat',
      area_name: 'Dang cap nhat',
      district_name: 'Dang cap nhat',
      ward_name: 'Dang cap nhat',
      city_name: 'Ho Chi Minh',
      listing_status: 'draft',
    };
    this.adminData.createLocation(newPlace).subscribe((place) => {
      this.router.navigate(['/admin/locations', place.slug]);
    });
  }

  setStatus(slug: string, status: AdminLocationRow['status']) {
    this.adminData.updateLocationStatus(slug, status);
  }

  deleteLocation(slug: string) {
    if (typeof window !== 'undefined' && !window.confirm('Xóa listing này?')) {
      return;
    }

    this.adminData.deleteLocation(slug);
  }
}
