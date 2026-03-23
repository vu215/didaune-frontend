import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Aside } from './shared/ui/aside/aside';
import { Header } from './shared/ui/header/header';
import { Tabbar } from './shared/ui/tabbar/tabbar';
import { DataService } from './core/services/data.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit {
  private dataService = inject(DataService);
  private locationPromptStorageKey = 'didaune_location_prompted';
  protected readonly title = signal('frontend');

  ngOnInit(): void {
    this.requestLocationOnEntry();
  }

  private requestLocationOnEntry() {
    if (typeof window === 'undefined' || typeof navigator === 'undefined' || !navigator.geolocation) {
      return;
    }

    if (this.dataService.currentCoordinates()) {
      return;
    }

    if (window.sessionStorage.getItem(this.locationPromptStorageKey) === '1') {
      return;
    }

    window.sessionStorage.setItem(this.locationPromptStorageKey, '1');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.dataService.setCurrentCoordinates({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      () => {
        this.dataService.setCurrentCoordinates(null);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000,
      }
    );
  }
}
