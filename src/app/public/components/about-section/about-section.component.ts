import { Component } from '@angular/core';
import { USER_ROLES } from '../../data/public-landing.data';

@Component({
  standalone: false,
  selector: 'app-about-section',
  templateUrl: './about-section.component.html',
  styleUrl: './about-section.component.scss',
})
export class AboutSectionComponent {
  readonly roles = USER_ROLES;
}
