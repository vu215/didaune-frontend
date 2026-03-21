import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Category, District, Place } from '../../core/models/app.models';
import { DataService } from '../../core/services/data.service';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-list',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './list.html',
  styleUrl: './list.css',
})
export class List implements OnInit {
  public dataService = inject(DataService);

  places = signal<Place[]>([]);
  categories = signal<Category[]>([]);
  allDistricts = signal<District[]>([]);
  
  districts = computed(() => 
    this.allDistricts().filter(d => d.city_id === this.dataService.currentCityId())
  );

  filteredPlaces = computed(() => {
    return this.places().filter(p => {
      const matchCity = p.city_id === this.dataService.currentCityId();
      const matchDistrict = this.dataService.currentDistrictId() === 'all' || p.district_id === this.dataService.currentDistrictId();
      const matchCategory = this.dataService.selectedCategoryId() === 'all' || p.categories.includes(this.dataService.selectedCategoryId());
      const matchSearch = !this.dataService.searchQuery() || 
        p.name.toLowerCase().includes(this.dataService.searchQuery().toLowerCase()) ||
        p.address.toLowerCase().includes(this.dataService.searchQuery().toLowerCase());
        
      return matchCity && matchDistrict && matchCategory && matchSearch;
    });
  });

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.dataService.getPlaces().subscribe(data => this.places.set(data));
    this.dataService.getCategories().subscribe(data => this.categories.set(data));
    this.dataService.getDistricts().subscribe(data => this.allDistricts.set(data));
  }

  onDistrictChange(event: any) {
    this.dataService.currentDistrictId.set(event.target.value);
  }

  onCategoryChange(event: any) {
    this.dataService.selectedCategoryId.set(event.target.value);
  }

  removeDistrictFilter() {
    this.dataService.currentDistrictId.set('all');
  }

  removeCategoryFilter() {
    this.dataService.selectedCategoryId.set('all');
  }
}
