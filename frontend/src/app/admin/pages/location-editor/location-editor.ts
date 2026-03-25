import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AdminAuthService } from '../../../core/services/admin/admin-auth.service';
import { AdminDataService, AdminLocationRow } from '../../../core/services/admin/admin-data.service';
import { Place } from '../../../core/models/app.models';

@Component({
  selector: 'app-admin-location-editor',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './location-editor.html',
})
export class LocationEditorAdmin {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private adminData = inject(AdminDataService);
  adminAuth = inject(AdminAuthService);

  row = signal<AdminLocationRow | undefined>(undefined);
  editModel = signal<Partial<Place>>({});

  quickChecks = computed(() => {
    const place = this.row()?.place;
    const edits = this.editModel();
    const merged = { ...place, ...edits };

    if (!merged) {
      return [];
    }

    return [
      { label: 'Cover image', done: Boolean(merged.image) },
      { label: 'Gallery', done: (merged.gallery?.length ?? 0) > 2 },
      { label: 'Area mapping', done: Boolean(merged.area_name) },
      { label: 'Phone / website', done: Boolean(merged.phone || merged.website) },
      { label: 'Coordinates', done: Boolean(merged.latitude && merged.longitude) },
      { label: 'Owner / partner', done: Boolean(merged.owner_name) },
    ];
  });

  constructor() {
    this.route.params.subscribe((params) => {
      const slug = params['slug'];
      if (!slug) {
        return;
      }
      this.adminData.getLocationBySlug(slug).subscribe((row) => {
        this.row.set(row);
        if (row) {
          this.editModel.set({ ...row.place });
        }
      });
    });
  }

  updateField(field: keyof Place, value: any) {
    this.editModel.set({
      ...this.editModel(),
      [field]: value
    });
  }

  save() {
    const row = this.row();
    if (!row) {
      return;
    }

    this.adminData.updateLocation(row.place.slug, this.editModel());
    // Provide some feedback or navigate back
    this.router.navigate(['/admin/locations']);
  }

  setStatus(status: AdminLocationRow['status']) {
    const row = this.row();
    if (!row) {
      return;
    }

    this.adminData.updateLocationStatus(row.place.slug, status);
  }
}
