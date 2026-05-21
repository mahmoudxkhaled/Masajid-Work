import { Component } from '@angular/core';
import { TRUST_BAR_ITEMS } from '../../data/public-landing.data';

@Component({
  standalone: false,
  selector: 'app-trust-bar-section',
  templateUrl: './trust-bar-section.component.html',
  styleUrl: './trust-bar-section.component.scss',
})
export class TrustBarSectionComponent {
  readonly items = TRUST_BAR_ITEMS;
}
