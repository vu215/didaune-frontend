import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataService } from '../services/data.service';
import { Place, Category, City, District } from '../models/app.models';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home implements OnInit {
  public dataService = inject(DataService);
  private router = inject(Router);

  hotPlaces = signal<Place[]>([]);
  categories = signal<Category[]>([]);
  cities = signal<City[]>([]);
  allDistricts = signal<District[]>([]);
  loading = signal(true);

  districts = computed(() => 
    this.allDistricts().filter(d => d.city_id === this.dataService.currentCityId())
  );

  displayLocationLabel = computed(() => {
    const city = this.cities().find(c => c.id === this.dataService.currentCityId());
    return city ? city.name : 'TP. Hồ Chí Minh';
  });

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.loading.set(true);
    this.dataService.getHotPlaces().subscribe(places => this.hotPlaces.set(places));
    this.dataService.getCategories().subscribe(cats => this.categories.set(cats));
    this.dataService.getCities().subscribe(data => this.cities.set(data));
    this.dataService.getDistricts().subscribe(data => {
      this.allDistricts.set(data);
      this.loading.set(false);
    });
  }

  onCityChange(event: any) {
    this.dataService.currentCityId.set(event.target.value);
    const firstDist = this.districts()[0];
    this.dataService.currentDistrictId.set(firstDist ? firstDist.id : 'all');
  }

  onDistrictChange(event: any) {
    this.dataService.currentDistrictId.set(event.target.value);
  }

  onCategoryClick(catId: string) {
    this.dataService.selectedCategoryId.set(catId);
    this.router.navigate(['/list']);
  }
}
