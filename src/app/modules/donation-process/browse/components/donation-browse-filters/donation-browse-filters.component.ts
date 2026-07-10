import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MessageService } from 'primeng/api';
import { TranslationService } from 'src/app/core/services/translation.service';
import { DonationBrowseFilterForm } from '../../../models/donation-request.model';

@Component({
  standalone: false,
  selector: 'app-donation-browse-filters',
  templateUrl: './donation-browse-filters.component.html',
  styleUrl: './donation-browse-filters.component.scss',
})
export class DonationBrowseFiltersComponent {
  @Input() loading = false;
  @Input() initialLoading = false;
  @Input() typeOptions: { label: string; value: number | null }[] = [];
  @Input() categoryOptions: { label: string; value: number | null }[] = [];
  @Input() countryOptions: { label: string; value: string }[] = [];
  @Input() sortOptions: { label: string; value: number }[] = [];
  @Input() filters: DonationBrowseFilterForm = this.createDefaultFilters();

  @Output() filtersApply = new EventEmitter<DonationBrowseFilterForm>();
  @Output() filtersReset = new EventEmitter<void>();
  @Output() typeChange = new EventEmitter<number | null>();

  filterDialogVisible = false;
  draftFilters: DonationBrowseFilterForm = this.createDefaultFilters();

  constructor(
    private translate: TranslationService,
    private messageService: MessageService,
  ) { }

  get activeFilterCount(): number {
    let count = 0;
    if (this.filters.donationTypeId) {
      count++;
    }
    if (this.filters.donationCategoryId) {
      count++;
    }
    if (this.filters.countryCode) {
      count++;
    }
    if (String(this.filters.city || '').trim()) {
      count++;
    }
    if (this.filters.maxEstimatedCost !== null && this.filters.maxEstimatedCost > 0) {
      count++;
    }
    if (Number(this.filters.sortBy || 0) !== 0) {
      count++;
    }
    return count;
  }

  openFilterDialog(): void {
    this.draftFilters = { ...this.filters };
    this.typeChange.emit(this.draftFilters.donationTypeId);
    this.filterDialogVisible = true;
  }

  onDraftTypeChange(): void {
    this.draftFilters.donationCategoryId = null;
    this.typeChange.emit(this.draftFilters.donationTypeId);
  }

  applyFilters(): void {
    if (!this.validateFilters(this.draftFilters)) {
      return;
    }
    this.filtersApply.emit({ ...this.draftFilters });
    this.filterDialogVisible = false;
  }

  resetAppliedFilters(): void {
    this.draftFilters = this.createDefaultFilters();
    this.typeChange.emit(null);
    this.filtersReset.emit();
    this.filterDialogVisible = false;
  }

  resetFilters(): void {
    this.resetAppliedFilters();
  }

  onFilterDialogHide(): void {
    this.typeChange.emit(this.filters.donationTypeId);
  }

  private createDefaultFilters(): DonationBrowseFilterForm {
    return {
      donationTypeId: null,
      donationCategoryId: null,
      countryCode: '',
      city: '',
      latitude: null,
      longitude: null,
      maxEstimatedCost: null,
      sortBy: 0,
    };
  }

  private validateFilters(form: DonationBrowseFilterForm): boolean {
    const countryCode = String(form.countryCode || '').trim().toUpperCase();
    if (countryCode && !/^[A-Z]{3}$/.test(countryCode)) {
      this.showValidationError('donations.browse.validation.countryInvalid');
      return false;
    }
    form.countryCode = countryCode;

    if (form.latitude !== null && (form.latitude < -90 || form.latitude > 90)) {
      this.showValidationError('donations.browse.validation.latitudeInvalid');
      return false;
    }

    if (form.longitude !== null && (form.longitude < -180 || form.longitude > 180)) {
      this.showValidationError('donations.browse.validation.longitudeInvalid');
      return false;
    }

    if (form.maxEstimatedCost !== null && form.maxEstimatedCost < 0) {
      this.showValidationError('donations.browse.validation.maxCostInvalid');
      return false;
    }

    return true;
  }

  private showValidationError(key: string): void {
    this.messageService.add({
      severity: 'warn',
      summary: this.translate.getInstant('common.error'),
      detail: this.translate.getInstant(key),
    });
  }
}
