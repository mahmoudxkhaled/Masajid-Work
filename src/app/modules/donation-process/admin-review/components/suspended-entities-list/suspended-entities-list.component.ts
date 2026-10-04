import { Component, OnDestroy, OnInit } from '@angular/core';
import { MessageService } from 'primeng/api';
import { Subscription } from 'rxjs';
import { LanguageDirService } from 'src/app/core/services/language-dir.service';
import { TranslationService } from 'src/app/core/services/translation.service';
import { DonationEntityTypeId } from '../../../models/entity-extra-data.model';
import {
  createEmptySuspendedEntityRow,
  SuspendedEntityBackend,
} from '../../../models/suspended-entity.model';
import { DonationAdminService } from '../../services/donation-admin.service';

type SuspendedEntitiesListContext = 'list';

interface EntityTypeOption {
  label: string;
  value: number;
}

@Component({
  standalone: false,
  selector: 'app-suspended-entities-list',
  templateUrl: './suspended-entities-list.component.html',
  styleUrl: './suspended-entities-list.component.scss',
})
export class SuspendedEntitiesListComponent implements OnInit, OnDestroy {
  rows = 10;
  readonly rowsPerPageOptions = [10, 25, 50, 100];

  entities: SuspendedEntityBackend[] = [];
  first = 0;
  totalRecords = 0;
  tableLoadingSpinner = true;
  initialLoading = true;

  entityTypeFilter = 0;
  entityTypeOptions: EntityTypeOption[] = [];

  private subscriptions: Subscription[] = [];

  constructor(
    private donationAdminService: DonationAdminService,
    private languageDirService: LanguageDirService,
    private translate: TranslationService,
    private messageService: MessageService,
  ) {}

  // #region Lifecycle
  ngOnInit(): void {
    this.subscriptions.push(
      this.languageDirService.userLanguageCode$.subscribe(() => {
        this.buildEntityTypeOptions();
      }),
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }
  // #endregion

  // #region Table
  get tableValue(): SuspendedEntityBackend[] {
    if (this.tableLoadingSpinner && this.entities.length === 0) {
      return Array.from({ length: this.rows }, () => createEmptySuspendedEntityRow());
    }
    return this.entities;
  }

  onPageChange(event: any): void {
    this.first = event?.first ?? 0;
    this.rows = event?.rows ?? this.rows;
    this.loadEntities();
  }

  onEntityTypeFilterChange(): void {
    this.first = 0;
    this.loadEntities();
  }

  getEntityTypeLabel(row: SuspendedEntityBackend): string {
    switch (Number(row.Entity_Type_ID || 0)) {
      case DonationEntityTypeId.Facility:
        return this.translate.getInstant('donations.adminSuspendedEntities.entityTypes.facility');
      case DonationEntityTypeId.Vendor:
        return this.translate.getInstant('donations.adminSuspendedEntities.entityTypes.vendor');
      case DonationEntityTypeId.CharityCenter:
        return this.translate.getInstant('donations.adminSuspendedEntities.entityTypes.charityCenter');
      default:
        return '-';
    }
  }
  // #endregion

  // #region Load data
  private loadEntities(): void {
    this.tableLoadingSpinner = true;
    const currentPage = Math.floor(this.first / this.rows) + 1;
    const lastEntityId = -currentPage;

    const sub = this.donationAdminService
      .listSuspendedEntities(this.entityTypeFilter, lastEntityId, this.rows)
      .subscribe({
        next: (response: any) => {
          console.log('listSuspendedEntities response', response);
          if (!response?.success) {
            this.handleBusinessError('list', response);
            return;
          }
          this.entities = response.message.Suspended_Entities || [];
          this.totalRecords = Number(response.message.Total_Count || 0);
        },
        error: () => {
          this.entities = [];
          this.totalRecords = 0;
          this.tableLoadingSpinner = false;
          this.initialLoading = false;
        },
        complete: () => {
          this.tableLoadingSpinner = false;
          this.initialLoading = false;
        },
      });
    this.subscriptions.push(sub);
  }

  private buildEntityTypeOptions(): void {
    this.entityTypeOptions = [
      { label: this.translate.getInstant('donations.adminSuspendedEntities.filters.allTypes'), value: 0 },
      {
        label: this.translate.getInstant('donations.adminSuspendedEntities.entityTypes.facility'),
        value: DonationEntityTypeId.Facility,
      },
      {
        label: this.translate.getInstant('donations.adminSuspendedEntities.entityTypes.vendor'),
        value: DonationEntityTypeId.Vendor,
      },
      {
        label: this.translate.getInstant('donations.adminSuspendedEntities.entityTypes.charityCenter'),
        value: DonationEntityTypeId.CharityCenter,
      },
    ];
  }
  // #endregion

  // #region Business errors
  private handleBusinessError(context: SuspendedEntitiesListContext, response: any): void {
    const code = String(response?.message || '');
    let detail: string | null = null;

    switch (context) {
      case 'list':
        detail = this.getListErrorMessage(code);
        this.tableLoadingSpinner = false;
        this.initialLoading = false;
        this.entities = [];
        this.totalRecords = 0;
        break;
    }

    if (detail) {
      this.messageService.add({
        severity: 'error',
        summary: this.translate.getInstant('common.error'),
        detail,
      });
    }
  }

  private getListErrorMessage(code: string): string | null {
    switch (code) {
      case 'DAP13037':
        return this.translate.getInstant('donations.adminSuspendedEntities.errors.invalidEntityType');
      case 'DAP13050':
        return this.translate.getInstant('donations.adminSuspendedEntities.errors.invalidFilterCount');
      case 'DAP11055':
        return this.translate.getInstant('donations.adminSuspendedEntities.errors.accessDenied');
      case 'DAP11040':
      case 'DAP11041':
      case 'DAP11042':
        return this.translate.getInstant('donations.adminSuspendedEntities.errors.sessionExpired');
      default:
        return this.translate.getInstant('donations.adminSuspendedEntities.errors.listFailed');
    }
  }
  // #endregion
}
