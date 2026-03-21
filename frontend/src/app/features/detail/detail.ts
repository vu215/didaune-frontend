import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { Place, PlaceReview } from '../../core/models/app.models';
import { DataService } from '../../core/services/data.service';

@Component({
  selector: 'app-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './detail.html',
  styleUrl: './detail.css',
})
export class Detail {
  private route = inject(ActivatedRoute);
  public dataService = inject(DataService);

  place = signal<Place | undefined>(undefined);
  reviews = signal<PlaceReview[]>([]);
  relatedPlaces = signal<Place[]>([]);

  constructor() {
    this.route.params.subscribe((params) => {
      const slug = params['slug'];

      if (!slug) {
        return;
      }

      this.dataService.getPlaceBySlug(slug).subscribe((place) => {
        this.place.set(place);

        if (!place) {
          return;
        }

        this.dataService.getReviewsByPlaceSlug(slug).subscribe((reviews) => this.reviews.set(reviews));
        this.dataService
          .getRelatedPlaces(place)
          .subscribe((relatedPlaces) => this.relatedPlaces.set(relatedPlaces));
      });
    });
  }

  toggleFavorite(event: Event, slug: string) {
    event.preventDefault();
    event.stopPropagation();
    this.dataService.toggleFavorite(slug);
  }
}
