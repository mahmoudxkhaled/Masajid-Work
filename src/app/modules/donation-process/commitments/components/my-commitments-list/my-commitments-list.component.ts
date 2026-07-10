import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Subscription } from 'rxjs';
import { LanguageDirService } from 'src/app/core/services/language-dir.service';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';
import { TranslationService } from 'src/app/core/services/translation.service';
import {
  DonationCommitmentBackend,
  DonationCommitmentListItem,
} from '../../../models/donation-commitment.model';
import { FulfillmentMode } from '../../../models/fulfillment-mode.model';
import { DonationCommitmentService } from '../../services/donation-commitment.service';

type MyCommitmentsListContext = 'list';

@Component({
  standalone: false,
  selector: 'app-my-commitments-list',
  templateUrl: './my-commitments-list.component.html',
  styleUrl: './my-commitments-list.component.scss',
})
export class MyCommitmentsListComponent implements OnInit, OnDestroy {
  rows = 10;
  readonly rowsPerPageOptions = [10, 25, 50, 100];

  commitments: DonationCommitmentListItem[] = [];

  first = 0;
  totalRecords = 0;
  tableLoadingSpinner = false;

  private rawCommitments: DonationCommitmentBackend[] = [];
  private subscriptions: Subscription[] = [];

  constructor(
    private donationCommitmentService: DonationCommitmentService,
    private localStorageService: LocalStorageService,
    private languageDirService: LanguageDirService,
    private translate: TranslationService,
    private messageService: MessageService,
    private router: Router,
  ) { }

  ngOnInit(): void {
    this.subscriptions.push(
      this.languageDirService.userLanguageCode$.subscribe(() => {
        this.refreshCommitments();
      }),
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  get tableValue(): DonationCommitmentListItem[] {
    if (this.tableLoadingSpinner && this.commitments.length === 0) {
      return Array(this.rows).fill(null).map(() => ({
        id: '',
        donationRequestId: '',
        entityId: 0,
        statusId: 0,
        title: '',
        fulfillmentMode: 0,
        isAnonymous: false,
        expectedClosureAt: '',
        acceptedAt: '',
      }));
    }
    return this.commitments;
  }

  onPageChange(event: any): void {
    this.first = event?.first ?? 0;
    this.rows = event?.rows ?? this.rows;
    this.loadCommitments();
  }

  viewCommitment(row: DonationCommitmentListItem, event?: Event): void {
    event?.stopPropagation();
    if (this.tableLoadingSpinner || !row.id) {
      return;
    }
    this.router.navigate(['/donations/commitments', row.id]);
  }

  getFulfillmentModeLabel(mode: number): string {
    if (mode === FulfillmentMode.SelfFulfillment) {
      return this.translate.getInstant('donations.commitments.fulfillmentMode.selfFulfillment');
    }
    if (mode === FulfillmentMode.ViaCharityRepresentative) {
      return this.translate.getInstant('donations.commitments.fulfillmentMode.viaCharityRepresentative');
    }
    return '-';
  }

  getAnonymousLabel(isAnonymous: boolean): string {
    return isAnonymous
      ? this.translate.getInstant('donations.browse.yes')
      : this.translate.getInstant('donations.browse.no');
  }

  private loadCommitments(): void {
    const donorUserId = Number(this.localStorageService.getUserDetails()?.User_ID || 0);
    if (!donorUserId) {
      this.commitments = [];
      this.totalRecords = 0;
      return;
    }

    this.tableLoadingSpinner = true;
    const currentPage = Math.floor(this.first / this.rows) + 1;
    const lastCommitmentId = -currentPage;

    const sub = this.donationCommitmentService
      .listDonorCommitments(donorUserId, [], lastCommitmentId, this.rows)
      .subscribe({
        next: (response: any) => {
          console.log('loadCommitments', response);
          if (!response?.success) {
            this.handleBusinessError('list', response);
            return;
          }

          const message = response.message ?? {};
          this.totalRecords = Number(message.Total_Count || 0);
          this.rawCommitments = Array.isArray(message.Commitments) ? message.Commitments : [];
          this.refreshCommitments();
        },
        error: () => {
          this.tableLoadingSpinner = false;
        },
        complete: () => {
          this.tableLoadingSpinner = false;
        },
      });
    this.subscriptions.push(sub);
  }

  private refreshCommitments(): void {
    this.commitments = this.rawCommitments.map((item) => ({
      id: String(item.Donation_Commitment_ID || ''),
      donationRequestId: String(item.Donation_Request_ID || ''),
      entityId: Number(item.Entity_ID || 0),
      statusId: Number(item.Status ?? item.Status_ID ?? 0),
      title: this.localStorageService.pickRequestContentField(
        String(item.Request_Title || ''),
        String(item.Request_Title_Regional || ''),
      ),
      fulfillmentMode: Number(item.Fulfillment_Mode || 0),
      isAnonymous: Boolean(item.Is_Anonymous),
      expectedClosureAt: String(item.Expected_Closure_At || ''),
      acceptedAt: String(item.Accepted_At || ''),
    }));
  }

  private handleBusinessError(context: MyCommitmentsListContext, response: any): void {
    const code = String(response?.message || '');
    let detail: string | null = null;

    switch (context) {
      case 'list':
        detail = this.getListErrorMessage(code);
        this.tableLoadingSpinner = false;
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
      case 'DAP13003':
        return this.translate.getInstant('donations.commitments.errors.commitmentNotFound');
      case 'DAP13014':
        return this.translate.getInstant('donations.commitments.errors.notDonor');
      case 'DAP11055':
        return this.translate.getInstant('donations.commitments.errors.accessDenied');
      case 'DAP11040':
      case 'DAP11041':
      case 'DAP11042':
        return this.translate.getInstant('donations.commitments.errors.sessionExpired');
      default:
        return null;
    }
  }
}
