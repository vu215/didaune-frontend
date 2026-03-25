import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import {
  AdminDataService,
  AdminImportBatch,
  AdminKpi,
  AdminLocationRow,
  AdminPartnerRow,
  AdminReportRow,
  AdminReviewRow,
} from '../../../core/services/admin/admin-data.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.html',
})
export class DashboardAdmin {
  adminData = inject(AdminDataService);

  kpis = signal<AdminKpi[]>([]);
  locations = signal<AdminLocationRow[]>([]);
  partners = signal<AdminPartnerRow[]>([]);
  imports = signal<AdminImportBatch[]>([]);
  reports = signal<AdminReportRow[]>([]);
  latestReviews = signal<AdminReviewRow[]>([]);
  charts = signal<{ traffic: number[]; vibes: { name: string; value: number }[] }>({ traffic: [], vibes: [] });

  constructor() {
    this.adminData.kpis$.subscribe((kpis) => this.kpis.set(kpis));
    this.adminData.getAdminLocations().subscribe((locations) => this.locations.set(locations.slice(0, 5)));
    this.adminData.getPartnerRequests().subscribe((partners) => {
      // Filter only pending requests for the dashboard highlight
      this.partners.set(partners.filter(p => p.status === 'pending').slice(0, 2));
    });
    this.adminData.getImportBatches().subscribe((imports) => this.imports.set(imports));
    this.adminData.getReports().subscribe((reports) => this.reports.set(reports));
    this.adminData.getAdminReviews().subscribe((reviews) => this.latestReviews.set(reviews.slice(0, 3)));
    this.adminData.getDashboardCharts().subscribe((charts) => this.charts.set(charts));
  }

  updatePartnerStatus(id: string, status: AdminPartnerRow['status']) {
    this.adminData.updatePartnerStatus(id, status);
  }
}
