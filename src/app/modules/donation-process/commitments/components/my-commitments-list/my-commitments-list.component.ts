import { Component, OnDestroy, OnInit } from '@angular/core';
import { MessageService } from 'primeng/api';
import { Subscription } from 'rxjs';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';
import { TranslationService } from 'src/app/core/services/translation.service';
import { DonationCommitmentBackend, DonationCommitmentListItem } from '../../../models/donation-commitment.model';
import { DonationRequestStatusBackend } from '../../../models/donation-request-status.model';
import { DonationReferenceService } from '../../../services/donation-reference.service';
import { DonationCommitmentService } from '../../services/donation-commitment.service';

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
  private rawStatuses: DonationRequestStatusBackend[] = [];
  private statusLabelById: Record<number, string> = {};
  private subscriptions: Subscription[] = [];

  constructor(
    private donationCommitmentService: DonationCommitmentService,
    private donationReferenceService: DonationReferenceService,
    private localStorageService: LocalStorageService,
    private translate: TranslationService,
    private messageService: MessageService,
  ) {}

  ngOnInit(): void {
    this.loadStatuses();
    this.loadCommitments();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  get tableValue(): DonationCommitmentListItem[] {
    if (this.tableLoadingSpinner && this.commitments.length === 0) {
      return Array(this.rows).fill(null).map(() => ({
        id: '',
        donationRequestId: '',
        statusId: 0,
        expectedClosureAt: '',
        createdAt: '',
      }));
    }
    return this.commitments;
  }

  onPageChange(event: any): void {
    this.first = event?.first ?? 0;
    this.rows = event?.rows ?? this.rows;
    this.loadCommitments();
  }

  getStatusLabel(statusId: number): string {
    return this.statusLabelById[statusId] || '';
  }

  private loadStatuses(): void {
    const sub = this.donationReferenceService.listDonationRequestStatuses().subscribe({
      next: (response: any) => {
        if (!response?.success) {
          return;
        }
        this.rawStatuses = this.donationReferenceService.extractDictionaryItems<DonationRequestStatusBackend>(
          response.message,
          'Request_Statuses',
        );
        const statuses = this.donationReferenceService.mapDonationRequestStatuses(this.rawStatuses);
        this.statusLabelById = statuses.reduce<Record<number, string>>((acc, item) => {
          acc[item.id] = item.name;
          return acc;
        }, {});
      },
    });
    this.subscriptions.push(sub);
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
          if (!response?.success) {
            this.handleBusinessError(response);
            return;
          }
          this.totalRecords = Number(response.message?.Total_Count || 0);
          this.rawCommitments = this.donationCommitmentService.extractCommitments(response.message);
          this.commitments = this.donationCommitmentService.mapCommitmentListItems(this.rawCommitments);
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

  private handleBusinessError(response: any): void {
    const code = String(response?.message || '');
    let detail: string | null = null;
    switch (code) {
      case 'DAP13014':
        detail = this.translate.getInstant('donations.commitments.messages.notDonor');
        break;
      default:
        detail = null;
    }
    if (detail) {
      this.messageService.add({
        severity: 'error',
        summary: this.translate.getInstant('common.error'),
        detail,
      });
    }
    this.tableLoadingSpinner = false;
  }
}
