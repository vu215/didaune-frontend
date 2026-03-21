import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Amenity } from '../../../core/models/app.models';
import { DataService } from '../../../core/services/data.service';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-aside',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './aside.html',
  styleUrl: './aside.css',
})
export class Aside implements OnInit {
  public dataService = inject(DataService);
  private router = inject(Router);
  
  amenities = signal<Amenity[]>([]);

  ngOnInit() {
    this.dataService.getDb().subscribe(db => {
      this.amenities.set(db.amenities);
    });
  }

  onCategoryClick(catId: string) {
    this.dataService.selectedCategoryId.set(catId);
    this.router.navigate(['/list']);
  }
}
