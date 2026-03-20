import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataService } from '../services/data.service';
import { City, District } from '../models/app.models';
import { Router } from '@angular/router';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class Header implements OnInit {
  public dataService = inject(DataService);
  private router = inject(Router);

  cities = signal<City[]>([]);
  allDistricts = signal<District[]>([]);

  districts = computed(() => 
    this.allDistricts().filter(d => d.city_id === this.dataService.currentCityId())
  );

  ngOnInit() {
    this.dataService.getCities().subscribe(data => this.cities.set(data));
    this.dataService.getDistricts().subscribe(data => this.allDistricts.set(data));
  }

  onCityChange(event: any) {
    this.dataService.currentCityId.set(event.target.value);
    const firstDist = this.districts()[0];
    this.dataService.currentDistrictId.set(firstDist ? firstDist.id : 'all');
  }

  onDistrictChange(event: any) {
    this.dataService.currentDistrictId.set(event.target.value);
  }

  onSearchChange(event: any) {
    this.dataService.searchQuery.set(event.target.value);
  }

  onSearchEnter() {
    this.router.navigate(['/list']);
  }

  clearSearch() {
    this.dataService.searchQuery.set('');
  }
}
