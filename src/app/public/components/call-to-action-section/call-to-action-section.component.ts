import { Component } from '@angular/core';
import {
  AUTH_LOGIN_PATH,
  REGISTER_DONOR_PATH,
  REGISTER_FACILITY_PATH,
} from '../../data/public-landing.data';

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
}
