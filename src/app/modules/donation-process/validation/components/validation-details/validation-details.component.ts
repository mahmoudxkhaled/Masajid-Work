import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Subscription } from 'rxjs';
import { FileDownloadService } from 'src/app/core/file-system-lib/services/file-download.service';
import { TransferProgressService } from 'src/app/core/file-system-lib/services/transfer-progress.service';
import { LanguageDirService } from 'src/app/core/services/language-dir.service';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';
import { TranslationService } from 'src/app/core/services/translation.service';
import { resolveValidationAttachmentOwner } from '../../../models/donation-attachment.constants';
import { DonationAttachment } from '../../../models/donation-attachment.model';
import {
  DonationValidationBackend,
  DonationValidationDetails,
} from '../../../models/donation-validation.model';
import { getDonationValidationResultLabelKey, getDonationValidationResultSeverity } from '../../../models/donation-validation-result.model';
import { DonationAttachmentService } from '../../../services/donation-attachment.service';
import { DonationValidationService } from '../../services/donation-validation.service';

type ValidationDetailsContext = 'load' | 'listAttachments' | 'download';

interface AttachmentDisplayItem {
  fileId: number;
  fileName: string;
  folderId: number;
  fileSystemId: number;
}

@Component({
  standalone: false,
  selector: 'app-validation-details',
  templateUrl: './validation-details.component.html',
  styleUrl: './validation-details.component.scss',
})
export class ValidationDetailsComponent implements OnInit, OnDestroy {
  requestId = 0;
  validationId = 0;
  loading = true;
  attachmentsLoading = false;
  details: DonationValidationDetails | null = null;
  decisionLabel = '';
  decisionSeverity: 'success' | 'info' | 'warning' | 'danger' | 'secondary' | 'contrast' = 'secondary';
  attachments: AttachmentDisplayItem[] = [];
  downloadingFileId: number | null = null;

  private rawDetails: DonationValidationBackend | null = null;
  private subscriptions: Subscription[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private donationValidationService: DonationValidationService,
    private donationAttachmentService: DonationAttachmentService,
    private fileDownloadService: FileDownloadService,
    private transferProgressService: TransferProgressService,
    private localStorageService: LocalStorageService,
    private languageDirService: LanguageDirService,
    private translate: TranslationService,
    private messageService: MessageService,
  ) {}

  ngOnInit(): void {
    this.requestId = Number(this.route.snapshot.paramMap.get('requestId') || 0);
    this.validationId = Number(this.route.snapshot.paramMap.get('validationId') || 0);
    this.subscriptions.push(
      this.languageDirService.userLanguageCode$.subscribe(() => {
        this.refreshLabels();
      }),
    );
    this.loadDetails();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
    this.transferProgressService.resetDownloadProgress();
  }

  goBack(): void {
    this.router.navigate(['/donations/validation', this.requestId, 'validations']);
  }

  canDownload(item: AttachmentDisplayItem): boolean {
    return item.fileId > 0 && item.folderId > 0 && item.fileSystemId > 0;
  }

  async downloadAttachment(item: AttachmentDisplayItem): Promise<void> {
    if (!this.canDownload(item) || this.downloadingFileId) {
      return;
    }

    const accessToken = this.localStorageService.getAccessToken();
    const fallbackName = item.fileName || `file_${item.fileId}`;
    this.downloadingFileId = item.fileId;
    this.transferProgressService.setDownloadProgress({
      visible: true,
      percent: 0,
      fileName: fallbackName,
      fileSizeBytes: 0,
      remainingBytes: 0,
    });

    try {
      const blob = await this.fileDownloadService.downloadFile(
        accessToken,
        BigInt(item.fileId),
        BigInt(item.folderId),
        item.fileSystemId,
        (percent) => {
          this.transferProgressService.setDownloadProgress({
            visible: true,
            percent: Math.round(percent),
            fileName: fallbackName,
            fileSizeBytes: 0,
            remainingBytes: 0,
          });
        },
      );

      const downloadName = fallbackName;
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = downloadName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      this.messageService.add({
        severity: 'success',
        summary: this.translate.getInstant('common.success'),
        detail: this.translate.getInstant('donations.validation.messages.downloaded'),
      });
    } catch (err: unknown) {
      console.error('downloadAttachment failed', err);
      const errorCode =
        err && typeof err === 'object' && 'errorCode' in err
          ? String((err as { errorCode?: unknown }).errorCode || '')
          : err && typeof err === 'object' && 'message' in err
            ? String((err as { message?: unknown }).message || '')
            : '';
      this.handleBusinessError('download', { message: errorCode });
    } finally {
      this.downloadingFileId = null;
      this.transferProgressService.resetDownloadProgress();
    }
  }

  private loadDetails(): void {
    if (!this.validationId) {
      this.loading = false;
      return;
    }

    this.loading = true;
    const sub = this.donationValidationService.getValidationDetails(this.validationId).subscribe({
      next: (response: any) => {
        console.log('getValidationDetails response', response);
        if (!response?.success) {
          this.handleBusinessError('load', response);
          this.loading = false;
          return;
        }
        this.rawDetails = this.donationValidationService.extractValidationDetails(response.message);
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

  private loadAttachments(): void {
    if (!this.validationId) {
      this.attachments = [];
      return;
    }

    const owner = resolveValidationAttachmentOwner(this.validationId);
    this.attachmentsLoading = true;
    const sub = this.donationAttachmentService
      .listDonationAttachments(owner.ownerType, owner.ownerId)
      .subscribe({
        next: (response: any) => {
          console.log('listDonationAttachments response', response);
          if (!response?.success) {
            this.handleBusinessError('listAttachments', response);
            this.attachments = [];
            this.attachmentsLoading = false;
            return;
          }
          const raw = this.donationAttachmentService.extractAttachments(response.message);
          const mapped = this.donationAttachmentService.mapDonationAttachments(raw);
          this.attachments = mapped.map((item: DonationAttachment) => ({
            fileId: item.fileId,
            fileName: item.caption || '',
            folderId: item.folderId,
            fileSystemId: item.fileSystemId,
          }));
          this.attachmentsLoading = false;
        },
        error: () => {
          this.attachments = [];
          this.attachmentsLoading = false;
        },
      });
    this.subscriptions.push(sub);
  }

  private refreshLabels(): void {
    this.details = this.donationValidationService.mapValidationDetails(this.rawDetails);
    this.decisionLabel = this.details
      ? this.translate.getInstant(getDonationValidationResultLabelKey(this.details.validationResult))
      : '';
    this.decisionSeverity = this.details
      ? getDonationValidationResultSeverity(this.details.validationResult)
      : 'secondary';
  }

  private handleBusinessError(context: ValidationDetailsContext, response: any): void {
    const code = String(response?.message || '');
    let detail: string | null = null;

    switch (context) {
      case 'load':
        detail = this.getLoadErrorMessage(code);
        break;
      case 'listAttachments':
        detail = this.getAttachmentsErrorMessage(code);
        break;
      case 'download':
        detail = this.getDownloadErrorMessage(code);
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
      case 'DAP13007':
        return this.translate.getInstant('donations.validation.errors.validationNotFound');
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

  private getAttachmentsErrorMessage(code: string): string | null {
    switch (code) {
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

  private getDownloadErrorMessage(code: string): string | null {
    switch (code) {
      case 'DAP12280':
        return this.translate.getInstant('donations.validation.errors.invalidFileAllocation');
      case 'DAP11055':
        return this.translate.getInstant('donations.validation.errors.accessDenied');
      case 'DAP11040':
      case 'DAP11041':
      case 'DAP11042':
        return this.translate.getInstant('donations.validation.errors.sessionExpired');
      default:
        return this.translate.getInstant('donations.validation.errors.downloadFailed');
    }
  }
}
