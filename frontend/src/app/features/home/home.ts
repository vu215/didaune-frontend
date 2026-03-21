import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Category, City, Place, Ward } from '../../core/models/app.models';
import { DataService } from '../../core/services/data.service';
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
  wards = signal<Ward[]>([]);
  wardQuery = signal('');
  wardDropdownOpen = signal(false);
  loading = signal(true);
  filteredWards = computed(() => {
    const query = this.wardQuery().trim().toLowerCase();

    if (!query) {
      return this.wards();
    }

    return this.wards().filter((ward) => ward.name.toLowerCase().includes(query));
  });

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
    this.dataService.getWardsByCityId(this.dataService.currentCityId()).subscribe(data => {
      this.wards.set(data);
      this.loading.set(false);
    });
  }

  onCityChange(event: any) {
    this.dataService.currentCityId.set(event.target.value);
    this.dataService.currentDistrictId.set('all');
    this.dataService.currentWardCode.set('');
    this.dataService.currentWardName.set('');
    this.wardQuery.set('');
    this.wardDropdownOpen.set(false);
    this.dataService.getWardsByCityId(event.target.value).subscribe(data => this.wards.set(data));
  }

  onWardInput(event: any) {
    const value = event.target.value.trim();
    this.wardQuery.set(value);
    this.wardDropdownOpen.set(true);

    if (!value) {
      this.dataService.currentWardCode.set('');
      this.dataService.currentWardName.set('');
      return;
    }

    const matchedWard = this.wards().find(
      (ward) => ward.name.toLowerCase() === value.toLowerCase()
    );

    this.dataService.currentWardCode.set(matchedWard ? String(matchedWard.code) : '');
    this.dataService.currentWardName.set(matchedWard ? matchedWard.name : value);
  }

  onWardFocus() {
    this.wardDropdownOpen.set(true);
  }

  onWardBlur() {
    setTimeout(() => this.wardDropdownOpen.set(false), 150);
  }

  selectWard(ward: Ward) {
    this.wardQuery.set(ward.name);
    this.dataService.currentWardCode.set(String(ward.code));
    this.dataService.currentWardName.set(ward.name);
    this.wardDropdownOpen.set(false);
  }

  onCategoryClick(catId: string) {
    this.dataService.selectedCategoryId.set(catId);
    this.router.navigate(['/discover']);
  }

  toggleFavorite(event: Event, slug: string) {
    event.preventDefault();
    event.stopPropagation();
    this.dataService.toggleFavorite(slug);
  }
}
