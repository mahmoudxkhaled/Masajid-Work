import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Subscription } from 'rxjs';
import { FileDownloadService } from 'src/app/core/file-system-lib/services/file-download.service';
import { TransferProgressService } from 'src/app/core/file-system-lib/services/transfer-progress.service';
import { LanguageDirService } from 'src/app/core/services/language-dir.service';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';
import { TranslationService } from 'src/app/core/services/translation.service';
import { DonationAttachmentOwnerType } from '../../../models/donation-attachment.constants';
import { DonationAttachment } from '../../../models/donation-attachment.model';
import {
  canFacilityReviewFulfillment,
  DonationFulfillmentBackend,
  DonationFulfillmentDetails,
} from '../../../models/donation-fulfillment.model';
import { getFulfillmentStatusLabelKey } from '../../../models/donation-fulfillment-status.model';
import { DonationRequestDetails } from '../../../models/donation-request.model';
import { getDonationRequestStatusLabelKey } from '../../../models/donation-request-status.model';
import { getFulfilledByLabelKey } from '../../../models/fulfilled-by.model';
import { DonationAttachmentService } from '../../../services/donation-attachment.service';
import { DonationFulfillmentService } from '../../../services/donation-fulfillment.service';
import { DonationRequestsService } from '../../services/donation-requests.service';

type FacilityFulfillmentReviewContext = 'loadFulfillment' | 'loadRequest' | 'listAttachments' | 'download';

interface ProofDisplayItem {
  fileId: number;
  fileName: string;
  fileType: string;
  folderId: number;
  fileSystemId: number;
}

@Component({
  standalone: false,
  selector: 'app-facility-fulfillment-review',
  templateUrl: './facility-fulfillment-review.component.html',
  styleUrl: './facility-fulfillment-review.component.scss',
})
export class FacilityFulfillmentReviewComponent implements OnInit, OnDestroy {
  requestId = 0;
  fulfillmentId = 0;
  loading = true;
  attachmentsLoading = false;
  downloadingFileId: number | null = null;

  details: DonationFulfillmentDetails | null = null;
  requestDetails: DonationRequestDetails | null = null;
  proofItems: ProofDisplayItem[] = [];
  fulfilledByLabel = '';
  fulfillmentStatusLabel = '';
  requestStatusLabel = '';
  requestStatusSeverity: 'success' | 'info' | 'warning' | 'danger' | 'secondary' | 'contrast' = 'info';

  confirmDialogVisible = false;
  rejectDialogVisible = false;

  private downloadInProgress = false;
  private downloadProgressPercent = 0;
  private downloadProgressVisible = false;
  private currentDownloadingFileName: string | null = null;
  private downloadFileSizeBytes = 0;
  private downloadRemainingBytes = 0;

  private rawDetails: DonationFulfillmentBackend | null = null;
  private returnTo: string | null = null;
  private subscriptions: Subscription[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private donationFulfillmentService: DonationFulfillmentService,
    private donationRequestsService: DonationRequestsService,
    private donationAttachmentService: DonationAttachmentService,
    private fileDownloadService: FileDownloadService,
    private transferProgressService: TransferProgressService,
    private localStorageService: LocalStorageService,
    private languageDirService: LanguageDirService,
    private translate: TranslationService,
    private messageService: MessageService,
  ) {
    const navState = this.router.getCurrentNavigation()?.extras?.state as { returnTo?: string } | undefined;
    this.returnTo = String(navState?.returnTo || history.state?.['returnTo'] || '').trim() || null;
  }

  ngOnInit(): void {
    this.requestId = Number(this.route.snapshot.paramMap.get('requestId') || 0);
    this.fulfillmentId = Number(this.route.snapshot.paramMap.get('fulfillmentId') || 0);
    if (!this.returnTo) {
      this.returnTo = String(history.state?.['returnTo'] || '').trim() || null;
    }
    this.subscriptions.push(
      this.languageDirService.userLanguageCode$.subscribe(() => {
        this.refreshLabels();
      }),
    );
    this.loadFulfillmentDetails();
    this.loadRequestDetails();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
    this.transferProgressService.resetDownloadProgress();
  }

  get canReview(): boolean {
    if (!this.fulfillmentId) {
      return false;
    }
    return canFacilityReviewFulfillment(this.requestDetails?.statusId);
  }

  backToList(): void {
    this.router.navigate(['/donations/facility/fulfillments']);
  }

  backToRequest(): void {
    if (!this.requestId) {
      this.backToList();
      return;
    }
    this.router.navigate(['/donations/facility/fulfillments', this.requestId], {
      state: this.returnTo ? { returnTo: this.returnTo } : undefined,
    });
  }

  openConfirmDialog(): void {
    this.confirmDialogVisible = true;
  }

  openRejectDialog(): void {
    this.rejectDialogVisible = true;
  }

  onConfirmed(): void {
    this.router.navigate(['/donations/facility/fulfillments']);
  }

  onRejected(): void {
    this.router.navigate(['/donations/facility/fulfillments']);
  }

  canDownload(item: ProofDisplayItem): boolean {
    return item.fileId > 0 && item.folderId > 0 && item.fileSystemId > 0;
  }

  async downloadProof(item: ProofDisplayItem): Promise<void> {
    if (!this.canDownload(item) || this.downloadInProgress) {
      return;
    }

    const accessToken = this.localStorageService.getAccessToken();
    const fallbackName = item.fileName || `file_${item.fileId}`;

    this.downloadInProgress = true;
    this.downloadingFileId = item.fileId;
    this.downloadProgressPercent = 0;
    this.currentDownloadingFileName = fallbackName;
    this.downloadFileSizeBytes = 0;
    this.downloadRemainingBytes = 0;
    this.downloadProgressVisible = true;
    this.syncDownloadProgressOverlay();

    try {
      const blob = await this.fileDownloadService.downloadFile(
        accessToken,
        BigInt(item.fileId),
        BigInt(item.folderId),
        item.fileSystemId,
        (percent) => {
          const progress = Math.round(percent);
          this.downloadProgressPercent = progress;

          if (this.downloadFileSizeBytes > 0) {
            const downloadedBytes = (this.downloadFileSizeBytes * progress) / 100;
            this.downloadRemainingBytes = Math.max(0, this.downloadFileSizeBytes - downloadedBytes);
          }
          this.syncDownloadProgressOverlay();
        },
      );

      const downloadName = fallbackName;
      this.currentDownloadingFileName = downloadName;
      this.syncDownloadProgressOverlay();

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = downloadName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      this.downloadProgressVisible = false;
      this.syncDownloadProgressOverlay();
      this.messageService.add({
        severity: 'success',
        summary: this.translate.getInstant('common.success'),
        detail: this.translate.getInstant('donations.facility.fulfillments.messages.downloaded'),
      });
    } catch (err: unknown) {
      console.error('downloadProof failed', err);
      this.downloadProgressVisible = false;
      this.syncDownloadProgressOverlay();
      const response = this.normalizeUploadError(err);
      this.handleBusinessError('download', response);
    } finally {
      this.downloadInProgress = false;
      this.downloadingFileId = null;
      this.downloadProgressPercent = 0;
      this.currentDownloadingFileName = null;
      this.downloadFileSizeBytes = 0;
      this.downloadRemainingBytes = 0;
      this.syncDownloadProgressOverlay();
    }
  }

  // #region Load data
  private loadFulfillmentDetails(): void {
    if (!this.fulfillmentId) {
      this.loading = false;
      return;
    }

    this.loading = true;
    const sub = this.donationFulfillmentService.getFulfillmentDetails(this.fulfillmentId).subscribe({
      next: (response: any) => {
        console.log('getFulfillmentDetails response', response);
        if (!response?.success) {
          this.handleBusinessError('loadFulfillment', response);
          this.loading = false;
          return;
        }

        const raw = this.donationFulfillmentService.extractFulfillmentDetails(response.message);
        this.rawDetails = raw;
        this.details = this.donationFulfillmentService.mapFulfillmentDetails(raw);
        this.refreshLabels();
        this.loadAttachments();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
    this.subscriptions.push(sub);
  }

  private loadRequestDetails(): void {
    if (!this.requestId) {
      return;
    }

    const sub = this.donationRequestsService.getDonationRequestDetails(this.requestId).subscribe({
      next: (response: any) => {
        console.log('getDonationRequestDetails response', response);
        if (!response?.success) {
          this.handleBusinessError('loadRequest', response);
          return;
        }

        const raw = this.donationRequestsService.extractDonationRequestDetails(response.message);
        this.requestDetails = this.donationRequestsService.mapDonationRequestDetails(raw);
        this.refreshLabels();
      },
    });
    this.subscriptions.push(sub);
  }

  private loadAttachments(): void {
    if (!this.fulfillmentId) {
      this.proofItems = [];
      return;
    }

    this.attachmentsLoading = true;
    const sub = this.donationAttachmentService
      .listDonationAttachments(DonationAttachmentOwnerType.DonationFulfillment, this.fulfillmentId)
      .subscribe({
        next: (response: any) => {
          console.log('listDonationAttachments response', response);
          if (!response?.success) {
            this.handleBusinessError('listAttachments', response);
            this.proofItems = [];
            this.attachmentsLoading = false;
            return;
          }

          const raw = this.donationAttachmentService.extractAttachments(response.message);
          const mapped = this.donationAttachmentService.mapDonationAttachments(raw);
          this.proofItems = mapped.map((item: DonationAttachment) => ({
            fileId: item.fileId,
            fileName: item.caption || '',
            fileType: '',
            folderId: item.folderId,
            fileSystemId: item.fileSystemId,
          }));
          this.attachmentsLoading = false;
        },
        error: () => {
          this.proofItems = [];
          this.attachmentsLoading = false;
        },
      });
    this.subscriptions.push(sub);
  }
  // #endregion

  private refreshLabels(): void {
    if (this.rawDetails) {
      this.details = this.donationFulfillmentService.mapFulfillmentDetails(this.rawDetails);
    }
    this.fulfilledByLabel = this.details
      ? this.translate.getInstant(getFulfilledByLabelKey(this.details.fulfilledBy))
      : '-';
    this.fulfillmentStatusLabel = this.details
      ? this.translate.getInstant(getFulfillmentStatusLabelKey(this.details.statusId))
      : '-';
    this.requestStatusLabel = this.requestDetails
      ? this.translate.getInstant(getDonationRequestStatusLabelKey(this.requestDetails.statusId))
      : '';
    this.requestStatusSeverity = this.getStatusSeverity(this.requestDetails?.statusCode || '');
  }

  private getStatusSeverity(
    code: string,
  ): 'success' | 'info' | 'warning' | 'danger' | 'secondary' | 'contrast' {
    switch (String(code || '').toUpperCase()) {
      case 'DRAFT':
        return 'secondary';
      case 'PENDING_REVIEW':
        return 'warning';
      case 'PUBLISHED':
      case 'ACCEPTED':
      case 'VALIDATED':
      case 'CLOSED':
        return 'success';
      case 'REJECTED':
      case 'CANCELLED':
        return 'danger';
      case 'FULFILLMENT_SUBMITTED':
      case 'IN_FULFILLMENT':
      case 'OPEN_FOR_VALIDATION':
        return 'info';
      default:
        return 'info';
    }
  }

  private handleBusinessError(context: FacilityFulfillmentReviewContext, response: any): void {
    const code = String(response?.message || response?.errorCode || '');
    let detail: string | null = null;

    switch (context) {
      case 'loadFulfillment':
        detail = this.getLoadFulfillmentErrorMessage(code);
        break;
      case 'loadRequest':
        detail = this.getLoadRequestErrorMessage(code);
        break;
      case 'listAttachments':
        detail = this.getListAttachmentsErrorMessage(code);
        break;
      case 'download':
        detail =
          this.getStorageApiErrorMessage(code) ??
          this.getNonCodeErrorDetail(response) ??
          this.translate.getInstant('donations.facility.fulfillments.errors.downloadFailed');
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

  private syncDownloadProgressOverlay(): void {
    this.transferProgressService.setDownloadProgress({
      visible: this.downloadProgressVisible,
      percent: this.downloadProgressPercent,
      fileName: this.currentDownloadingFileName,
      fileSizeBytes: this.downloadFileSizeBytes,
      remainingBytes: this.downloadRemainingBytes,
    });
  }

  private normalizeUploadError(err: unknown): Record<string, unknown> {
    if (!err || typeof err !== 'object') {
      return {};
    }
    const e = err as Record<string, unknown>;
    if (typeof e['Body'] === 'string') {
      try {
        return JSON.parse(e['Body'] as string) as Record<string, unknown>;
      } catch {
        return { message: e['Body'] };
      }
    }
    if (e['error'] && typeof e['error'] === 'object') {
      return e['error'] as Record<string, unknown>;
    }
    if (typeof e['error'] === 'string') {
      return { message: e['error'] };
    }
    if (e['errorCode'] != null && e['message'] == null) {
      return { message: e['errorCode'] };
    }
    return e;
  }

  private getNonCodeErrorDetail(response: any): string | null {
    const read = (root: any): string | null => {
      if (root == null) {
        return null;
      }
      const msg = root.message;
      if (msg != null && typeof msg === 'object' && (msg as { detail?: string }).detail != null) {
        return String((msg as { detail?: string }).detail);
      }
      if (typeof msg === 'string' && !/^(ERP|DAP|FWA)\d+$/i.test(msg)) {
        return msg;
      }
      return null;
    };
    return read(response) ?? read(response?.error);
  }

  private getLoadFulfillmentErrorMessage(code: string): string | null {
    switch (code) {
      case 'DAP13005':
        return this.translate.getInstant('donations.facility.fulfillments.errors.fulfillmentNotFound');
      case 'DAP11055':
        return this.translate.getInstant('donations.facility.fulfillments.errors.accessDenied');
      case 'DAP11040':
      case 'DAP11041':
      case 'DAP11042':
        return this.translate.getInstant('donations.facility.fulfillments.errors.sessionExpired');
      default:
        return null;
    }
  }

  private getLoadRequestErrorMessage(code: string): string | null {
    switch (code) {
      case 'DAP13000':
        return this.translate.getInstant('donations.facility.fulfillments.errors.requestNotFound');
      case 'DAP13013':
        return this.translate.getInstant('donations.facility.fulfillments.errors.notOwnerFacility');
      case 'DAP11055':
        return this.translate.getInstant('donations.facility.fulfillments.errors.accessDenied');
      case 'DAP11040':
      case 'DAP11041':
      case 'DAP11042':
        return this.translate.getInstant('donations.facility.fulfillments.errors.sessionExpired');
      default:
        return null;
    }
  }

  private getListAttachmentsErrorMessage(code: string): string | null {
    switch (code) {
      case 'DAP11055':
        return this.translate.getInstant('donations.facility.fulfillments.errors.accessDenied');
      case 'DAP11040':
      case 'DAP11041':
      case 'DAP11042':
        return this.translate.getInstant('donations.facility.fulfillments.errors.sessionExpired');
      default:
        return null;
    }
  }

  private getStorageApiErrorMessage(code: string): string | null {
    switch (code) {
      case 'DAP12000':
        return this.translate.getInstant('fileSystem.admin.errorAccessDenied');
      case 'DAP12001':
        return this.translate.getInstant('fileSystem.admin.errorBlockedIpPermanent');
      case 'DAP12002':
        return this.translate.getInstant('fileSystem.admin.errorBlockedIpTemporary');
      case 'DAP12005':
        return this.translate.getInstant('fileSystem.admin.errorMissingStorageToken');
      case 'DAP12006':
        return this.translate.getInstant('fileSystem.admin.errorInvalidStorageToken');
      case 'DAP12007':
        return this.translate.getInstant('fileSystem.admin.errorAccessDeniedAction');
      case 'DAP12008':
        return this.translate.getInstant('fileSystem.admin.errorInvalidRequestRouting');
      case 'DAP12009':
        return this.translate.getInstant('fileSystem.admin.errorRequestUnderDevelopment');
      case 'DAP12010':
        return this.translate.getInstant('fileSystem.admin.errorResponseManagement');
      case 'DAP12011':
        return this.translate.getInstant('fileSystem.admin.errorApiCallExecution');
      case 'DAP12012':
        return this.translate.getInstant('fileSystem.admin.errorFileServerDatabase');
      case 'DAP12240':
        return this.translate.getInstant('fileSystem.admin.errorInvalidFileId');
      case 'DAP12250':
        return this.translate.getInstant('fileSystem.admin.errorInvalidFolderId');
      case 'DAP12260':
        return this.translate.getInstant('fileSystem.admin.errorInvalidFileSystemId');
      case 'DAP12270':
        return this.translate.getInstant('fileSystem.admin.errorInvalidFileSystemAccessToken');
      case 'DAP12280':
        return this.translate.getInstant('fileSystem.admin.errorInvalidFileAllocation');
      case 'DAP12290':
        return this.translate.getInstant('fileSystem.admin.errorInvalidDriveId');
      case 'DAP12291':
        return this.translate.getInstant('fileSystem.admin.errorDriveInactive');
      case 'DAP12292':
        return this.translate.getInstant('fileSystem.admin.errorAccessDeniedDriveOwner');
      case 'DAP12295':
        return this.translate.getInstant('fileSystem.admin.errorNotEnoughFileSystemAccessRight');
      case 'DAP12241':
        return this.translate.getInstant('fileSystem.admin.errorInvalidFileId');
      default:
        return null;
    }
  }
}
