import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
} from '@angular/core';
import { MessageService } from 'primeng/api';
import { Subscription } from 'rxjs';
import { FileDownloadService } from 'src/app/core/file-system-lib/services/file-download.service';
import { TransferProgressService } from 'src/app/core/file-system-lib/services/transfer-progress.service';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';
import { TranslationService } from 'src/app/core/services/translation.service';
import { DonationAttachment } from '../../models/donation-attachment.model';
import {
  DonationAttachmentKind,
  getDonationAttachmentKindLabelKey,
} from '../../models/donation-attachment.constants';
import { DonationAttachmentService } from '../../services/donation-attachment.service';

type DonationAttachmentListContext = 'list' | 'remove' | 'download';

@Component({
  standalone: false,
  selector: 'app-donation-attachment-list',
  templateUrl: './donation-attachment-list.component.html',
  styleUrl: './donation-attachment-list.component.scss',
})
export class DonationAttachmentListComponent implements OnChanges, OnDestroy {
  @Input() ownerType: number | null = null;
  @Input() ownerId = 0;
  @Input() readonly = false;
  @Input() allowRemove = false;
  @Input() allowDownload = true;

  @Output() attachmentsChanged = new EventEmitter<void>();
  @Output() attachmentsLoaded = new EventEmitter<DonationAttachment[]>();

  loading = false;
  attachments: DonationAttachment[] = [];
  removeDialogVisible = false;
  selectedAttachment: DonationAttachment | null = null;
  downloadingFileId: number | null = null;

  isLoading$ = this.donationAttachmentService.isLoadingSubject.asObservable();

  private subscriptions: Subscription[] = [];

  constructor(
    private donationAttachmentService: DonationAttachmentService,
    private fileDownloadService: FileDownloadService,
    private transferProgressService: TransferProgressService,
    private localStorageService: LocalStorageService,
    private translate: TranslationService,
    private messageService: MessageService,
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['ownerType'] || changes['ownerId']) {
      this.reload();
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
    this.transferProgressService.resetDownloadProgress();
  }

  reload(): void {
    const ownerType = Number(this.ownerType || 0);
    const ownerId = Number(this.ownerId || 0);
    if (!ownerType || !ownerId) {
      this.attachments = [];
      this.attachmentsLoaded.emit(this.attachments);
      return;
    }

    this.loading = true;
    const sub = this.donationAttachmentService.listDonationAttachments(ownerType, ownerId).subscribe({
      next: (response: any) => {
        console.log('listDonationAttachments response', response);
        if (!response?.success) {
          this.handleBusinessError('list', response);
          this.attachments = [];
          this.loading = false;
          return;
        }

        const raw = this.donationAttachmentService.extractAttachments(response.message);
        this.attachments = this.donationAttachmentService
          .mapDonationAttachments(raw)
          .sort((a, b) => a.sortOrder - b.sortOrder || a.donationAttachmentId - b.donationAttachmentId);
        this.loading = false;
        this.attachmentsLoaded.emit(this.attachments);
      },
      error: () => {
        this.attachments = [];
        this.loading = false;
      },
    });
    this.subscriptions.push(sub);
  }

  openRemoveDialog(item: DonationAttachment): void {
    if (this.readonly || !this.allowRemove) {
      return;
    }
    this.selectedAttachment = item;
    this.removeDialogVisible = true;
  }

  closeRemoveDialog(): void {
    this.removeDialogVisible = false;
    this.selectedAttachment = null;
  }

  confirmRemove(): void {
    const id = Number(this.selectedAttachment?.donationAttachmentId || 0);
    if (!id) {
      return;
    }

    const sub = this.donationAttachmentService.removeDonationAttachment(id).subscribe({
      next: (response: any) => {
        console.log('removeDonationAttachment response', response);
        if (!response?.success) {
          this.handleBusinessError('remove', response);
          return;
        }

        this.messageService.add({
          severity: 'success',
          summary: this.translate.getInstant('common.success'),
          detail: this.translate.getInstant('donations.attachments.messages.removed'),
        });
        this.closeRemoveDialog();
        this.reload();
        this.attachmentsChanged.emit();
      },
    });
    this.subscriptions.push(sub);
  }

  canDownload(item: DonationAttachment): boolean {
    return this.allowDownload && item.fileId > 0 && item.folderId > 0 && item.fileSystemId > 0;
  }

  async downloadAttachment(item: DonationAttachment): Promise<void> {
    if (!this.canDownload(item) || this.downloadingFileId) {
      return;
    }

    const accessToken = this.localStorageService.getAccessToken();
    const fallbackName = this.getDisplayName(item) || `file_${item.fileId}`;
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
        detail: this.translate.getInstant('donations.attachments.messages.downloaded'),
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

  getDisplayName(item: DonationAttachment): string {
    return item.caption || `#${item.fileId || item.donationAttachmentId}`;
  }

  getKindIcon(item: DonationAttachment): string {
    switch (item.attachmentKind) {
      case DonationAttachmentKind.PhotoImage:
        return 'pi pi-image';
      case DonationAttachmentKind.PdfDocument:
        return 'pi pi-file-pdf';
      case DonationAttachmentKind.Video:
        return 'pi pi-video';
      default:
        return 'pi pi-paperclip';
    }
  }

  getKindLabel(item: DonationAttachment): string {
    return this.translate.getInstant(getDonationAttachmentKindLabelKey(item.attachmentKind));
  }

  private handleBusinessError(context: DonationAttachmentListContext, response: any): void {
    const code = String(response?.message || '');
    let detail: string | null = null;

    switch (context) {
      case 'list':
        detail = this.getListErrorMessage(code);
        break;
      case 'remove':
        detail = this.getRemoveErrorMessage(code);
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

  private getListErrorMessage(code: string): string | null {
    switch (code) {
      case 'DAP13008':
        return this.translate.getInstant('donations.attachments.errors.invalidOwner');
      case 'DAP11055':
        return this.translate.getInstant('donations.attachments.errors.accessDenied');
      case 'DAP11040':
      case 'DAP11041':
      case 'DAP11042':
        return this.translate.getInstant('donations.attachments.errors.sessionExpired');
      default:
        return null;
    }
  }

  private getRemoveErrorMessage(code: string): string | null {
    switch (code) {
      case 'DAP13008':
        return this.translate.getInstant('donations.attachments.errors.invalidAttachment');
      case 'DAP13010':
        return this.translate.getInstant('donations.attachments.errors.ownerNotEditable');
      case 'DAP11055':
        return this.translate.getInstant('donations.attachments.errors.accessDenied');
      case 'DAP11040':
      case 'DAP11041':
      case 'DAP11042':
        return this.translate.getInstant('donations.attachments.errors.sessionExpired');
      default:
        return null;
    }
  }

  private getDownloadErrorMessage(code: string): string | null {
    switch (code) {
      case 'DAP12280':
        return this.translate.getInstant('donations.attachments.errors.invalidFileAllocation');
      case 'DAP11055':
        return this.translate.getInstant('donations.attachments.errors.accessDenied');
      case 'DAP11040':
      case 'DAP11041':
      case 'DAP11042':
        return this.translate.getInstant('donations.attachments.errors.sessionExpired');
      default:
        return this.translate.getInstant('donations.attachments.errors.downloadFailed');
    }
  }
}
