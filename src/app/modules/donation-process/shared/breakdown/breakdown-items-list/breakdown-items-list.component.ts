import { Component, Input } from '@angular/core';
import { DonationBreakdownItem } from '../../../models/donation-breakdown-request.model';

@Component({
  standalone: false,
  selector: 'app-breakdown-items-list',
  templateUrl: './breakdown-items-list.component.html',
  styleUrl: './breakdown-items-list.component.scss',
})
export class BreakdownItemsListComponent {
  @Input() items: DonationBreakdownItem[] = [];
  @Input() loading = false;
  @Input() rows = 10;

  get tableValue(): DonationBreakdownItem[] {
    if (this.loading) {
      return Array.from({ length: this.rows }, () => ({
        title: '',
        description: '',
        quantity: 0,
        estimatedCost: 0,
        currencyCode: '',
        donorPortion: false,
      }));
    }
    return this.items;
  }

  formatCost(row: DonationBreakdownItem): string {
    if (!row.estimatedCost && !row.currencyCode) {
      return '-';
    }
    return `${row.estimatedCost || 0} ${row.currencyCode || ''}`.trim();
  }
}
