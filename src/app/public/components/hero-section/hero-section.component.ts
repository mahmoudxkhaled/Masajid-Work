import { Component } from '@angular/core';
import {
  HERO_IMAGE,
  REGISTER_DONOR_PATH,
  REGISTER_FACILITY_PATH,
} from '../../data/public-landing.data';

@Component({
  standalone: false,
  selector: 'app-hero-section',
  templateUrl: './hero-section.component.html',
  styleUrl: './hero-section.component.scss',
})
export class HeroSectionComponent {
  readonly heroImage = HERO_IMAGE;
  readonly registerDonorPath = REGISTER_DONOR_PATH;
  readonly registerFacilityPath = REGISTER_FACILITY_PATH;
}
