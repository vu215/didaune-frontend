import { Component, computed, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { City, Ward } from '../../../core/models/app.models';
import { DataService } from '../../../core/services/data.service';
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
  wards = signal<Ward[]>([]);
  authModalOpen = signal(false);
  authMode = signal<'login' | 'register'>('login');
  mobileSearchOpen = signal(false);
  wardQuery = signal('');
  wardDropdownOpen = signal(false);
  filteredWards = computed(() => {
    const query = this.wardQuery().trim().toLowerCase();

    if (!query) {
      return this.wards();
    }

    return this.wards().filter((ward) => ward.name.toLowerCase().includes(query));
  });

  ngOnInit() {
    this.dataService.getCities().subscribe(data => this.cities.set(data));
    this.loadWards(this.dataService.currentCityId());
  }

  onCityChange(event: any) {
    this.dataService.currentCityId.set(event.target.value);
    this.dataService.currentDistrictId.set('all');
    this.dataService.currentWardCode.set('');
    this.wardQuery.set('');
    this.wardDropdownOpen.set(false);
    this.loadWards(event.target.value);
  }

  onWardInput(event: any) {
    const value = event.target.value.trim();
    this.wardQuery.set(value);
    this.wardDropdownOpen.set(true);

    if (!value) {
      this.dataService.currentWardCode.set('');
      return;
    }

    const matchedWard = this.wards().find(
      (ward) => ward.name.toLowerCase() === value.toLowerCase()
    );

    this.dataService.currentWardCode.set(matchedWard ? String(matchedWard.code) : '');
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
    this.wardDropdownOpen.set(false);
  }

  onSearchChange(event: any) {
    this.dataService.searchQuery.set(event.target.value);
  }

  onSearchEnter() {
    this.mobileSearchOpen.set(false);
    this.router.navigate(['/list']);
  }

  clearSearch() {
    this.dataService.searchQuery.set('');
  }

  openAuthModal(mode: 'login' | 'register' = 'login') {
    this.authMode.set(mode);
    this.authModalOpen.set(true);
  }

  closeAuthModal() {
    this.authModalOpen.set(false);
  }

  setAuthMode(mode: 'login' | 'register') {
    this.authMode.set(mode);
  }

  toggleMobileSearch() {
    this.mobileSearchOpen.update((open) => !open);
  }

  closeMobileSearch() {
    this.mobileSearchOpen.set(false);
  }

  private loadWards(cityId: string) {
    this.dataService.getWardsByCityId(cityId).subscribe((data) => this.wards.set(data));
  }
}
