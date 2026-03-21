import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { Place } from '../../core/models/app.models';
import { DataService } from '../../core/services/data.service';

@Component({
  selector: 'app-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './detail.html',
  styleUrl: './detail.css',
})
export class Detail implements OnInit {
  private route = inject(ActivatedRoute);
  private dataService = inject(DataService);

  place = signal<Place | undefined>(undefined);

  ngOnInit() {
    this.route.params.subscribe(params => {
      const slug = params['slug'];
      if (slug) {
        this.dataService.getPlaceBySlug(slug).subscribe(data => this.place.set(data));
      }
    });
  }
}
