import { Component, OnDestroy, OnInit } from '@angular/core';
import { MessageService } from 'primeng/api';
import { Subscription } from 'rxjs';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';
import { TranslationService } from 'src/app/core/services/translation.service';
import { DonationCommitmentBackend, DonationCommitmentListItem } from '../../../models/donation-commitment.model';
import { DonationRequestStatusBackend } from '../../../models/donation-request-status.model';
import { DonationReferenceService } from '../../../services/donation-reference.service';
import { CharityRepresentationService } from '../../services/charity-representation.service';

@Component({
  standalone: false,
  selector: 'app-charity-representation-list',
  templateUrl: './charity-representation-list.component.html',
  styleUrl: './charity-representation-list.component.scss',
})
export class CharityRepresentationListComponent implements OnInit, OnDestroy {
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
    private charityRepresentationService: CharityRepresentationService,
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
    const charityEntityId = Number(this.localStorageService.getEntityId() || 0);
    if (!charityEntityId) {
      this.commitments = [];
      this.totalRecords = 0;
      return;
    }

    this.tableLoadingSpinner = true;
    const currentPage = Math.floor(this.first / this.rows) + 1;
    const lastCommitmentId = -currentPage;

    const sub = this.charityRepresentationService
      .listRepresentationRequests(charityEntityId, true, lastCommitmentId, this.rows)
      .subscribe({
        next: (response: any) => {
          if (!response?.success) {
            this.tableLoadingSpinner = false;
            return;
          }
          this.totalRecords = Number(response.message?.Total_Count || 0);
          this.rawCommitments = this.charityRepresentationService.extractCommitments(response.message);
          this.commitments = this.charityRepresentationService.mapCommitments(this.rawCommitments);
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
}
