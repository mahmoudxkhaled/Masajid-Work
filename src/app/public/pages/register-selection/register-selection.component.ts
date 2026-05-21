import { Component } from '@angular/core';
import { BrandingService } from 'src/app/core/services/branding.service';
import { REGISTRATION_SELECTION_CARDS } from '../../data/public-register.data';

@Component({
  standalone: false,
  selector: 'app-register-selection',
  templateUrl: './register-selection.component.html',
  styleUrl: './register-selection.component.scss',
})
export class RegisterSelectionComponent {
  readonly cards = REGISTRATION_SELECTION_CARDS;
  readonly brandingParams = this.branding.translateParams;

  constructor(private readonly branding: BrandingService) {}
}
