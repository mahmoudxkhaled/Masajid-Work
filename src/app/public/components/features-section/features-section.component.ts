import { Component } from '@angular/core';
import { FEATURE_CARDS } from '../../data/public-landing.data';

@Component({
  standalone: false,
  selector: 'app-features-section',
  templateUrl: './features-section.component.html',
  styleUrl: './features-section.component.scss',
})
export class FeaturesSectionComponent {
  readonly cards = FEATURE_CARDS;
}
