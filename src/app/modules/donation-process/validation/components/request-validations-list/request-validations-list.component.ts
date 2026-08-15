import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Subscription } from 'rxjs';
import { LanguageDirService } from 'src/app/core/services/language-dir.service';
import { TranslationService } from 'src/app/core/services/translation.service';
import {
  DonationValidationBackend,
  DonationValidationListItem,
} from '../../../models/donation-validation.model';
import {
  getDonationValidationResultLabelKey,
  getDonationValidationResultSeverity,
} from '../../../models/donation-validation-result.model';
import { DonationValidationService } from '../../services/donation-validation.service';

type RequestValidationsListContext = 'list';

@Component({
  standalone: false,
  selector: 'app-request-validations-list',
  templateUrl: './request-validations-list.component.html',
  styleUrl: './request-validations-list.component.scss',
})
export class RequestValidationsListComponent implements OnInit, OnDestroy {
  requestId = 0;
  loading = true;
  validations: DonationValidationListItem[] = [];
  rows = 10;

  private rawValidations: DonationValidationBackend[] = [];
  private subscriptions: Subscription[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private donationValidationService: DonationValidationService,
    private languageDirService: LanguageDirService,
    private translate: TranslationService,
    private messageService: MessageService,
  ) {}

  get tableValue(): DonationValidationListItem[] {
    if (this.loading && this.validations.length === 0) {
      return Array(this.rows).fill(null).map(() => ({} as DonationValidationListItem));
    }
    return this.validations;
  }

  ngOnInit(): void {
    this.requestId = Number(this.route.snapshot.paramMap.get('requestId') || 0);
    this.subscriptions.push(
      this.languageDirService.userLanguageCode$.subscribe(() => {
        this.refreshLabels();
      }),
    );
    this.loadValidations();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  goBack(): void {
    this.router.navigate(['/donations/validation', this.requestId]);
  }

  viewDetails(row: DonationValidationListItem): void {
    const validationId = Number(row.id || 0);
    if (!this.requestId || !validationId || this.loading) {
      return;
    }
    this.router.navigate(['/donations/validation', this.requestId, 'validations', validationId]);
  }

  getDecisionLabel(result: number): string {
    return this.translate.getInstant(getDonationValidationResultLabelKey(result));
  }

  getDecisionSeverity(
    result: number,
  ): 'success' | 'info' | 'warning' | 'danger' | 'secondary' | 'contrast' {
    return getDonationValidationResultSeverity(result);
  }

  private loadValidations(): void {
    if (!this.requestId) {
      this.loading = false;
      return;
    }

    this.loading = true;
    const sub = this.donationValidationService.listRequestValidations(this.requestId).subscribe({
      next: (response: any) => {
        console.log('listRequestValidations response', response);
        if (!response?.success) {
          this.handleBusinessError('list', response);
          this.validations = [];
          this.loading = false;
          return;
        }
        this.rawValidations = Array.isArray(response.message) ? response.message : [];
        this.refreshLabels();
        this.loading = false;
      },
      error: () => {
        this.validations = [];
        this.loading = false;
      },
    });
    this.subscriptions.push(sub);
  }

  private refreshLabels(): void {
    this.validations = this.rawValidations.map((item) =>
      this.donationValidationService.mapValidationListItem(item),
    );
  }

  private handleBusinessError(context: RequestValidationsListContext, response: any): void {
    const code = String(response?.message || '');
    let detail: string | null = null;

    switch (context) {
      case 'list':
        detail = this.getListErrorMessage(code);
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
      case 'DAP13000':
        return this.translate.getInstant('donations.validation.errors.requestNotFound');
      case 'DAP11055':
        return this.translate.getInstant('donations.validation.errors.accessDenied');
      case 'DAP11040':
      case 'DAP11041':
      case 'DAP11042':
        return this.translate.getInstant('donations.validation.errors.sessionExpired');
      default:
        return null;
    }
  }
}
