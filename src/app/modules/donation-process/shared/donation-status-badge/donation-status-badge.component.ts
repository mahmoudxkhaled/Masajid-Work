import { Component, Input } from '@angular/core';

@Component({
  standalone: false,
  selector: 'app-donation-status-badge',
  templateUrl: './donation-status-badge.component.html',
  styleUrl: './donation-status-badge.component.scss',
})
export class DonationStatusBadgeComponent {
  @Input() label = '';
  @Input() severity: 'success' | 'info' | 'warning' | 'danger' | 'secondary' | 'contrast' = 'info';
}
