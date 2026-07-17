import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Subscription } from 'rxjs';
import { LanguageDirService } from 'src/app/core/services/language-dir.service';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';
import { TranslationService } from 'src/app/core/services/translation.service';
import { DonationCommitmentBackend, CharityRepresentationListItem } from '../../../models/donation-commitment.model';
import { CharityRepresentationService } from '../../services/charity-representation.service';

type CharityRepresentationListContext = 'list';
type CharityRepresentationListMode = 'representation' | 'assigned';

const ASSIGNED_COMMITMENT_STATUS = 4;

@Component({
  standalone: false,
  selector: 'app-charity-representation-list',
  templateUrl: './charity-representation-list.component.html',
  styleUrl: './charity-representation-list.component.scss',
})
export class CharityRepresentationListComponent implements OnInit, OnDestroy {
  rows = 10;
  readonly rowsPerPageOptions = [10, 25, 50, 100];

  mode: CharityRepresentationListMode = 'representation';
  commitments: CharityRepresentationListItem[] = [];
  pendingOnly = true;
  first = 0;
  totalRecords = 0;
  tableLoadingSpinner = false;

  private rawCommitments: DonationCommitmentBackend[] = [];
  private skeletonRows: CharityRepresentationListItem[] = this.createSkeletonRows();
  private subscriptions: Subscription[] = [];

  constructor(
    private charityRepresentationService: CharityRepresentationService,
    private localStorageService: LocalStorageService,
    private languageDirService: LanguageDirService,
    private translate: TranslationService,
    private messageService: MessageService,
    private route: ActivatedRoute,
    private router: Router,
  ) { }

  ngOnInit(): void {
    this.mode = (this.route.snapshot.data['mode'] as CharityRepresentationListMode) || 'representation';
    if (this.isAssignedMode) {
      this.pendingOnly = false;
    }
    this.subscriptions.push(
      this.languageDirService.userLanguageCode$.subscribe(() => {
        this.refreshCommitments();
      }),
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  get isAssignedMode(): boolean {
    return this.mode === 'assigned';
  }

  get titleKey(): string {
    return this.isAssignedMode
      ? 'donations.charityRepresentation.assigned.title'
      : 'donations.charityRepresentation.title';
  }

  get subtitleKey(): string {
    return this.isAssignedMode
      ? 'donations.charityRepresentation.assigned.subtitle'
      : 'donations.charityRepresentation.subtitle';
  }

  get emptyKey(): string {
    return this.isAssignedMode
      ? 'donations.charityRepresentation.assigned.empty'
      : 'donations.charityRepresentation.empty';
  }

  get tableValue(): CharityRepresentationListItem[] {
    if (this.tableLoadingSpinner && this.commitments.length === 0) {
      return this.skeletonRows;
    }
    return this.commitments;
  }

  onPageChange(event: any): void {
    const first = event?.first ?? 0;
    const rows = event?.rows ?? this.rows;

    setTimeout(() => {
      this.first = first;
      this.rows = rows;
      this.skeletonRows = this.createSkeletonRows();
      this.loadCommitments();
    });
  }

  viewDetails(row: CharityRepresentationListItem, event?: Event): void {
    event?.stopPropagation();
    if (this.tableLoadingSpinner || !row.id) {
      return;
    }
    this.router.navigate(['/donations/charity/representation', row.id]);
  }

  getAnonymousLabel(isAnonymous: boolean): string {
    return isAnonymous
      ? this.translate.getInstant('donations.browse.yes')
      : this.translate.getInstant('donations.browse.no');
  }

  // #region Load data

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
      .listRepresentationRequests(charityEntityId, this.pendingOnly, lastCommitmentId, this.rows)
      .subscribe({
        next: (response: any) => {
          console.log('listRepresentationRequests response', response);
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

  // #endregion

  private refreshCommitments(): void {
    const rawItems = this.isAssignedMode
      ? this.rawCommitments.filter((item) => Number(item.Status) === ASSIGNED_COMMITMENT_STATUS)
      : this.rawCommitments;

    this.commitments = rawItems.map((item) => ({
      id: String(item.Donation_Commitment_ID || ''),
      donationRequestId: String(item.Donation_Request_ID || ''),
      donorUserId: Number(item.Donor_User_ID || 0),
      entityId: Number(item.Entity_ID || 0),
      title: this.localStorageService.pickRequestContentField(
        String(item.Request_Title || ''),
        String(item.Request_Title_Regional || ''),
      ),
      isAnonymous: Boolean(item.Is_Anonymous),
      expectedClosureAt: String(item.Expected_Closure_At || ''),
      acceptedAt: String(item.Accepted_At || ''),
    }));
  }

  private createSkeletonRows(): CharityRepresentationListItem[] {
    return Array(this.rows).fill(null).map(() => ({
      id: '',
      donationRequestId: '',
      donorUserId: 0,
      entityId: 0,
      title: '',
      isAnonymous: false,
      expectedClosureAt: '',
      acceptedAt: '',
    }));
  }

  private handleBusinessError(context: CharityRepresentationListContext, response: any): void {
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
        return this.translate.getInstant('donations.charityRepresentation.errors.commitmentNotFound');
      case 'DAP13015':
        return this.translate.getInstant('donations.charityRepresentation.errors.notAssignedRepresentative');
      case 'DAP13010':
        return this.translate.getInstant('donations.charityRepresentation.errors.invalidStatus');
      case 'DAP11055':
        return this.translate.getInstant('donations.charityRepresentation.errors.accessDenied');
      case 'DAP11040':
      case 'DAP11041':
      case 'DAP11042':
        return this.translate.getInstant('donations.charityRepresentation.errors.sessionExpired');
      default:
        return null;
    }
  }
}
