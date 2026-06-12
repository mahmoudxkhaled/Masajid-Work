import { Component, OnDestroy, OnInit } from '@angular/core';
import { MessageService } from 'primeng/api';
import { Subscription } from 'rxjs';
import { LanguageDirService } from 'src/app/core/services/language-dir.service';
import { TranslationService } from 'src/app/core/services/translation.service';
import { DonationCategory, DonationCategoryBackend } from '../../../models/donation-category.model';
import { DonationType, DonationTypeBackend } from '../../../models/donation-type.model';
import { DonationReferenceService } from '../../../services/donation-reference.service';

@Component({
  standalone: false,
  selector: 'app-donation-categories-list',
  templateUrl: './donation-categories-list.component.html',
  styleUrl: './donation-categories-list.component.scss',
})
export class DonationCategoriesListComponent implements OnInit, OnDestroy {
  rows = 10;
  readonly rowsPerPageOptions = [10, 25, 50, 100];

  categories: DonationCategory[] = [];
  typeOptions: { label: string; value: number }[] = [];
  selectedTypeId: number | null = null;
  loadingTypes = false;
  tableLoadingSpinner = false;

  private rawCategories: DonationCategoryBackend[] = [];
  private rawTypes: DonationTypeBackend[] = [];
  private subscriptions: Subscription[] = [];

  constructor(
    private donationReferenceService: DonationReferenceService,
    private languageDirService: LanguageDirService,
    private translate: TranslationService,
    private messageService: MessageService,
  ) {}

  ngOnInit(): void {
    this.subscriptions.push(
      this.languageDirService.userLanguageCode$.subscribe(() => {
        this.remapCategories();
        this.remapTypes();
      }),
    );
    this.loadTypes();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  get tableValue(): DonationCategory[] {
    if (this.tableLoadingSpinner && this.categories.length === 0) {
      return Array(this.rows).fill(null).map(() => ({
        id: 0,
        donationTypeId: 0,
        code: '',
        name: '',
        isService: false,
        defaultOrder: 0,
        active: false,
      }));
    }
    return this.categories;
  }

  onTypeChange(): void {
    this.loadCategories();
  }

  private loadTypes(): void {
    this.loadingTypes = true;
    const sub = this.donationReferenceService.listDonationTypes().subscribe({
      next: (response: any) => {
        if (!response?.success) {
          this.loadingTypes = false;
          return;
        }
        this.rawTypes = this.donationReferenceService.extractDictionaryItems<DonationTypeBackend>(
          response.message,
          'Donation_Types',
        );
        this.remapTypes();
        if (this.typeOptions.length > 0 && !this.selectedTypeId) {
          this.selectedTypeId = this.typeOptions[0].value;
          this.loadCategories();
        }
        this.loadingTypes = false;
      },
      error: () => {
        this.loadingTypes = false;
      },
    });
    this.subscriptions.push(sub);
  }

  private loadCategories(): void {
    if (!this.selectedTypeId) {
      this.categories = [];
      return;
    }

    this.tableLoadingSpinner = true;
    const sub = this.donationReferenceService.listDonationCategories(this.selectedTypeId, false).subscribe({
      next: (response: any) => {
        if (!response?.success) {
          this.tableLoadingSpinner = false;
          return;
        }
        this.rawCategories = this.donationReferenceService.extractDictionaryItems<DonationCategoryBackend>(
          response.message,
          'Donation_Categories',
        );
        this.remapCategories();
        this.tableLoadingSpinner = false;
      },
      error: () => {
        this.tableLoadingSpinner = false;
      },
    });
    this.subscriptions.push(sub);
  }

  private remapCategories(): void {
    this.categories = this.donationReferenceService.mapDonationCategories(this.rawCategories);
  }

  private remapTypes(): void {
    const types = this.donationReferenceService.mapDonationTypes(this.rawTypes);
    this.typeOptions = types.map((item) => ({ label: item.name, value: item.id }));
  }
}
