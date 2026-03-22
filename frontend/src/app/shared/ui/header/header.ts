import { Component, computed, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { City, Ward } from '../../../core/models/app.models';
import { AdminAuthService } from '../../../core/services/admin/admin-auth.service';
import { DataService } from '../../../core/services/data.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class Header implements OnInit {
  public dataService = inject(DataService);
  public adminAuth = inject(AdminAuthService);
  private router = inject(Router);

  cities = signal<City[]>([]);
  wards = signal<Ward[]>([]);
  authModalOpen = signal(false);
  authMode = signal<'login' | 'register'>('login');
  mobileSearchOpen = signal(false);
  wardQuery = signal('');
  wardDropdownOpen = signal(false);
  authName = signal('');
  authEmail = signal(this.dataService.currentUser().email);
  authPassword = signal('');
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
    this.dataService.currentWardName.set('');
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
    this.authName.set(this.dataService.currentUser().name);
    this.authEmail.set(this.dataService.currentUser().email);
    this.authPassword.set('');
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

  submitAuth() {
    const name = this.authName().trim() || this.dataService.currentUser().name;
    const email = this.authEmail().trim() || this.dataService.currentUser().email;
    const avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(
      name
    )}&background=f97316&color=fff&size=128`;

    this.dataService.upsertCurrentUser({ name, email, avatar });
    this.authModalOpen.set(false);
  }

  private loadWards(cityId: string) {
    this.dataService.getWardsByCityId(cityId).subscribe((data) => this.wards.set(data));
  }
}
