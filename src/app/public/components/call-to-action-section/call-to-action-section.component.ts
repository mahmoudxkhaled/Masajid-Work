import { Component } from '@angular/core';
import type { ISourceOptions } from '@tsparticles/engine';
import {
  AUTH_LOGIN_PATH,
  REGISTER_DONOR_PATH,
  REGISTER_FACILITY_PATH,
} from '../../data/public-landing.data';
import {
  buildNightSkyOptions,
  initParticlesEngine,
  prefersReducedMotion,
} from 'src/app/Shared/particles/particles-options';

@Component({
  standalone: false,
  selector: 'app-call-to-action-section',
  templateUrl: './call-to-action-section.component.html',
  styleUrl: './call-to-action-section.component.scss',
})
export class CallToActionSectionComponent {
  readonly loginPath = AUTH_LOGIN_PATH;
  readonly registerDonorPath = REGISTER_DONOR_PATH;
  readonly registerFacilityPath = REGISTER_FACILITY_PATH;
  readonly particleOptions: ISourceOptions = buildNightSkyOptions(prefersReducedMotion(), {
    stars: 30,
    brightStars: 5,
    shootingStars: 1,
  });
  readonly initParticles = initParticlesEngine;
}
