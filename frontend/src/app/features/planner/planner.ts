import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Place } from '../../core/models/app.models';
import { DataService } from '../../core/services/data.service';

@Component({
  selector: 'app-planner',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './planner.html',
  styleUrl: './planner.css',
})
export class Planner {
  public dataService = inject(DataService);

  places = signal<Place[]>([]);
  mood = signal<'date' | 'work' | 'photo' | 'group'>('date');
  budget = signal<'low' | 'medium' | 'high'>('medium');
  timeOfDay = signal<'morning' | 'afternoon' | 'night'>('afternoon');

  candidates = computed(() => {
    const preferredCategory = this.mood();
    const districtId = this.dataService.currentDistrictId();

    return this.places()
      .filter((place) => place.city_id === this.dataService.currentCityId())
      .filter((place) => districtId === 'all' || place.district_id === districtId)
      .sort((first, second) => {
        const firstScore = this.scorePlace(first, preferredCategory);
        const secondScore = this.scorePlace(second, preferredCategory);
        return secondScore - firstScore;
      });
  });

  itinerary = computed(() => {
    const picks = this.candidates().slice(0, 3);
    const slots =
      this.timeOfDay() === 'morning'
        ? ['08:30', '11:00', '14:00']
        : this.timeOfDay() === 'night'
          ? ['17:30', '19:30', '21:30']
          : ['14:00', '16:30', '19:30'];

    return picks.map((place, index) => ({
      time: slots[index] ?? '20:00',
      note: this.buildStopNote(place, index),
      place,
    }));
  });

  constructor() {
    this.dataService.getPlaces().subscribe((places) => this.places.set(places));
  }

  setMood(value: 'date' | 'work' | 'photo' | 'group') {
    this.mood.set(value);
  }

  setBudget(value: 'low' | 'medium' | 'high') {
    this.budget.set(value);
  }

  setTime(value: 'morning' | 'afternoon' | 'night') {
    this.timeOfDay.set(value);
  }

  private scorePlace(place: Place, preferredCategory: string): number {
    let score = place.rating * 20 + place.review_count;

    if (place.categories.includes(preferredCategory)) {
      score += 180;
    }

    if (this.budget() === 'low' && place.price_range.includes('100-200')) {
      score -= 80;
    }

    if (this.timeOfDay() === 'night' && place.amenities.includes('late')) {
      score += 50;
    }

    if (this.timeOfDay() === 'morning' && place.hours.some((hour) => hour.times.join(' ').includes('08:00'))) {
      score += 40;
    }

    return score;
  }

  private buildStopNote(place: Place, index: number): string {
    if (index === 0) {
      return `Bat dau o ${place.name} de vao vibe va khoi dong nhiep song.`;
    }

    if (index === 1) {
      return `Chuyen tiep sang ${place.name} de doi khong khi va thu them mot trai nghiem moi.`;
    }

    return `Ket thuc lich trinh tai ${place.name} de dong lai mot buoi di choi tron ven.`;
  }
}
