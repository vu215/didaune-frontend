import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AdminDataService, AdminReportRow } from '../../../core/services/admin/admin-data.service';

@Component({
  selector: 'app-admin-reports',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './reports-admin.html',
})
export class ReportsAdmin {
  private adminData = inject(AdminDataService);
  private router = inject(Router);

  rows = signal<AdminReportRow[]>([]);

  constructor() {
    this.adminData.getReports().subscribe((rows) => this.rows.set(rows));
  }

  processReport(report: AdminReportRow) {
    this.router.navigate(['/admin/locations'], {
      queryParams: {
        q: report.title,
      },
    });
  }
}
