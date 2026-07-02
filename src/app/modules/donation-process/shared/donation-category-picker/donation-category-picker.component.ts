import { Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges } from '@angular/core';
import { Subscription } from 'rxjs';
import { LanguageDirService } from 'src/app/core/services/language-dir.service';
import { DonationCategory, DonationCategoryBackend } from '../../models/donation-category.model';
import { DonationReferenceService } from '../../services/donation-reference.service';

@Component({
  standalone: false,
  selector: 'app-donation-category-picker',
  templateUrl: './donation-category-picker.component.html',
  styleUrl: './donation-category-picker.component.scss',
})
export class DonationCategoryPickerComponent implements OnInit, OnChanges, OnDestroy {
  @Input() donationTypeId = 0;
  @Input() activeOnly = true;
  @Input() selectedCategoryId: number | null = null;
  @Input() disabled = false;
  @Input() placeholderKey = 'donations.shared.categoryPicker.placeholder';

  @Output() selectedCategoryIdChange = new EventEmitter<number | null>();

  categories: DonationCategory[] = [];
  loading = false;

  private rawCategories: DonationCategoryBackend[] = [];
  private subscriptions: Subscription[] = [];

  constructor(
    private donationReferenceService: DonationReferenceService,
    private languageDirService: LanguageDirService,
  ) { }

  ngOnInit(): void {
    this.subscriptions.push(
      this.languageDirService.userLanguageCode$.subscribe(() => {
        this.remapCategories();
      }),
    );
    this.loadCategories();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['donationTypeId']) {
      this.loadCategories();
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  onCategoryChange(categoryId: number | null): void {
    this.selectedCategoryId = categoryId;
    this.selectedCategoryIdChange.emit(categoryId);
  }

  private loadCategories(): void {
    if (!this.donationTypeId) {
      this.rawCategories = [];
      this.categories = [];
      return;
    }

    this.loading = true;
    const sub = this.donationReferenceService
      .listDonationCategories(this.donationTypeId, this.activeOnly)
      .subscribe({
        next: (response: any) => {
          if (!response?.success) {
            this.rawCategories = [];
            this.categories = [];
            return;
          }
          this.rawCategories = this.donationReferenceService.extractDictionaryItems<DonationCategoryBackend>(response.message);
          this.remapCategories();
        },
        complete: () => {
          this.loading = false;
        },
      });
    this.subscriptions.push(sub);
  }

  private remapCategories(): void {
    if (!this.rawCategories.length) {
      this.categories = [];
      return;
    }
    this.categories = this.donationReferenceService.mapDonationCategories(this.rawCategories);
  }
}
