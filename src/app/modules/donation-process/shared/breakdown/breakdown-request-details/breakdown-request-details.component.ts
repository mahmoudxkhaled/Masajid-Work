import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Subscription } from 'rxjs';
import { LanguageDirService } from 'src/app/core/services/language-dir.service';
import { TranslationService } from 'src/app/core/services/translation.service';
import { DonationAttachmentOwnerType } from '../../../models/donation-attachment.constants';
import {
  BreakdownScreenMode,
  DonationBreakdownRequestBackend,
  DonationBreakdownRequestDetails,
} from '../../../models/donation-breakdown-request.model';
import {
  getBreakdownStatusLabelKey,
  getBreakdownStatusSeverity,
  isBreakdownConfirmed,
  isBreakdownPending,
} from '../../../models/donation-breakdown-request-status.model';
import { DonationBreakdownService } from '../../../services/donation-breakdown.service';

type BreakdownRequestDetailsContext = 'load';

@Component({
  standalone: false,
  selector: 'app-breakdown-request-details',
  templateUrl: './breakdown-request-details.component.html',
  styleUrl: './breakdown-request-details.component.scss',
})
export class BreakdownRequestDetailsComponent implements OnInit, OnDestroy {
  readonly breakdownAttachmentOwnerType = DonationAttachmentOwnerType.DonationBreakdownRequest;

  mode: BreakdownScreenMode = 'donor';
  breakdownRequestId = 0;
  requestId = 0;
  commitmentId = 0;
  loading = true;
  details: DonationBreakdownRequestDetails | null = null;
  statusLabel = '';
  statusSeverity: 'success' | 'info' | 'warning' | 'danger' | 'secondary' | 'contrast' = 'secondary';

  confirmDialogVisible = false;
  rejectDialogVisible = false;
  applyDialogVisible = false;
  appliedSubRequestIds: number[] = [];

  private fromQueue = false;
  private rawDetails: DonationBreakdownRequestBackend | null = null;
  private returnTo = '';
  private subscriptions: Subscription[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private donationBreakdownService: DonationBreakdownService,
    private languageDirService: LanguageDirService,
    private translate: TranslationService,
    private messageService: MessageService,
  ) {}

  ngOnInit(): void {
    this.mode = (this.route.snapshot.data['mode'] as BreakdownScreenMode) || 'donor';
    this.fromQueue = Boolean(this.route.snapshot.data['fromQueue']);
    this.breakdownRequestId = Number(this.route.snapshot.paramMap.get('breakdownRequestId') || 0);
    this.commitmentId = this.mode === 'donor' ? Number(this.route.snapshot.paramMap.get('id') || 0) : 0;
    this.requestId = Number(
      this.route.snapshot.paramMap.get('requestId') ||
        (this.mode === 'donor' ? 0 : this.route.snapshot.paramMap.get('id') || 0),
    );
    this.returnTo = String(history.state?.['returnTo'] || '');

    const toastDetailKey = history.state?.['toastDetailKey'];
    if (toastDetailKey) {
      const toastSeverity = String(history.state?.['toastSeverity'] || 'success');
      const { toastDetailKey: _removed, toastSeverity: _severityRemoved, ...restState } = history.state || {};
      history.replaceState(restState, '');
      setTimeout(() => {
        this.messageService.add({
          severity: toastSeverity === 'warn' ? 'warn' : 'success',
          summary: this.translate.getInstant(
            toastSeverity === 'warn' ? 'common.warning' : 'common.success',
          ),
          detail: this.translate.getInstant(String(toastDetailKey)),
        });
      });
    }

    this.subscriptions.push(
      this.languageDirService.userLanguageCode$.subscribe(() => {
        this.refreshDisplay();
      }),
    );
    this.loadDetails();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  get canConfirm(): boolean {
    return this.mode === 'facility' && !!this.details && isBreakdownPending(this.details.statusId, this.details.statusCode);
  }

  get canReject(): boolean {
    if (!this.details) {
      return false;
    }
    const pending = isBreakdownPending(this.details.statusId, this.details.statusCode);
    const confirmed = isBreakdownConfirmed(this.details.statusId, this.details.statusCode);
    if (this.mode === 'facility') {
      return pending;
    }
    if (this.mode === 'admin') {
      return confirmed;
    }
    return false;
  }

  get canApply(): boolean {
    return (
      this.mode === 'admin' &&
      !!this.details &&
      isBreakdownConfirmed(this.details.statusId, this.details.statusCode)
    );
  }

  back(): void {
    if (this.mode === 'donor') {
      this.router.navigate(['/donations/commitments', this.commitmentId]);
      return;
    }
    if (this.returnTo) {
      this.router.navigateByUrl(this.returnTo);
      return;
    }
    if (this.mode === 'facility') {
      this.router.navigate(['/donations/facility/requests', this.requestId || this.details?.donationRequestId, 'breakdown']);
      return;
    }
    if (this.fromQueue || !this.requestId) {
      this.router.navigate(['/donations/admin/breakdown-review']);
      return;
    }
    this.router.navigate([
      '/donations/admin/requests',
      this.requestId || this.details?.donationRequestId,
      'breakdown',
    ]);
  }

  openConfirmDialog(): void {
    this.confirmDialogVisible = true;
  }

  openRejectDialog(): void {
    this.rejectDialogVisible = true;
  }

  openApplyDialog(): void {
    this.applyDialogVisible = true;
  }

  onConfirmed(): void {
    this.messageService.add({
      severity: 'success',
      summary: this.translate.getInstant('common.success'),
      detail: this.translate.getInstant('donations.breakdown.messages.confirmed'),
    });
    this.loadDetails();
  }

  onRejected(): void {
    this.messageService.add({
      severity: 'success',
      summary: this.translate.getInstant('common.success'),
      detail: this.translate.getInstant('donations.breakdown.messages.rejected'),
    });
    this.loadDetails();
  }

  onApplied(subRequestIds: number[] = []): void {
    this.appliedSubRequestIds = Array.isArray(subRequestIds) ? subRequestIds.filter((id) => id > 0) : [];
    this.messageService.add({
      severity: 'success',
      summary: this.translate.getInstant('common.success'),
      detail: this.translate.getInstant('donations.breakdown.messages.applied'),
    });
    this.loadDetails();
  }

  onStatusStale(): void {
    this.loadDetails();
  }

  private loadDetails(): void {
    if (!this.breakdownRequestId) {
      this.loading = false;
      this.back();
      return;
    }

    this.loading = true;
    const sub = this.donationBreakdownService.getBreakdownRequestDetails(this.breakdownRequestId).subscribe({
      next: (response: any) => {
        console.log('getBreakdownRequestDetails response', response);
        if (!response?.success) {
          this.handleBusinessError('load', response);
          this.loading = false;
          return;
        }
        this.rawDetails = response.message as DonationBreakdownRequestBackend;
        this.refreshDisplay();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
    this.subscriptions.push(sub);
  }

  private refreshDisplay(): void {
    this.details = this.donationBreakdownService.mapBreakdownRequestDetails(this.rawDetails);
    if (!this.details) {
      this.statusLabel = '';
      this.statusSeverity = 'secondary';
      return;
    }
    this.statusLabel = this.translate.getInstant(
      getBreakdownStatusLabelKey(this.details.statusId, this.details.statusCode),
    );
    this.statusSeverity = getBreakdownStatusSeverity(this.details.statusId, this.details.statusCode);
    if (!this.requestId) {
      this.requestId = Number(this.details.donationRequestId || 0);
    }
    if (!this.commitmentId) {
      this.commitmentId = Number(this.details.donationCommitmentId || 0);
    }
  }

  private handleBusinessError(context: BreakdownRequestDetailsContext, response: any): void {
    const code = String(response?.message || '');
    let detail: string | null = null;

    switch (context) {
      case 'load':
        detail = this.getLoadErrorMessage(code);
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

  private getLoadErrorMessage(code: string): string | null {
    switch (code) {
      case 'DAP13006':
        return this.translate.getInstant('donations.breakdown.errors.invalidBreakdownRequestId');
      case 'DAP13033':
        return this.translate.getInstant('donations.breakdown.errors.actionNotAccessible');
      case 'DAP11055':
        return this.translate.getInstant('donations.breakdown.errors.accessDenied');
      case 'DAP11040':
      case 'DAP11041':
      case 'DAP11042':
        return this.translate.getInstant('donations.breakdown.errors.sessionExpired');
      default:
        return this.translate.getInstant('donations.breakdown.errors.actionFailed');
    }
  }
}
