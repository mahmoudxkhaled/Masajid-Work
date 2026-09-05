import { Component, EventEmitter, Input, OnDestroy, Output } from '@angular/core';
import { MessageService } from 'primeng/api';
import { firstValueFrom } from 'rxjs';
import { FileUploadService } from 'src/app/core/file-system-lib/services/file-upload.service';
import {
  TransferFileStatus,
  TransferProgressService,
} from 'src/app/core/file-system-lib/services/transfer-progress.service';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';
import { TranslationService } from 'src/app/core/services/translation.service';
import {
  DonationStorageFolderKey,
  getDonationStorageLocation,
} from '../../config/donation-storage.config';
import {
  isDonationAttachmentKindReady,
  isDonationAttachmentOwnerTypeReady,
  resolveDonationAttachmentKindFromFile,
} from '../../models/donation-attachment.constants';
import {
  DONATION_ATTACHMENT_ALLOWED_EXTENSIONS,
  DONATION_ATTACHMENT_MAX_FILE_SIZE_BYTES,
  UploadedStorageFile,
} from '../../models/donation-attachment.model';
import { DonationAttachmentService } from '../../services/donation-attachment.service';

type DonationAttachmentUploaderContext = 'add';

@Component({
  standalone: false,
  selector: 'app-donation-attachment-uploader',
  templateUrl: './donation-attachment-uploader.component.html',
  styleUrl: './donation-attachment-uploader.component.scss',
})
export class DonationAttachmentUploaderComponent implements OnDestroy {
  @Input() ownerType: number | null = null;
  @Input() ownerId = 0;
  @Input() attachmentKind: number | null = null;
  @Input() storageFolder: DonationStorageFolderKey = 'otherDonationAttachments';
  @Input() disabled = false;
  @Input() readonly = false;
  @Input() maxFiles = 5;
  @Input() maxFileSize = DONATION_ATTACHMENT_MAX_FILE_SIZE_BYTES;
  @Input() allowedFileTypes: readonly string[] = DONATION_ATTACHMENT_ALLOWED_EXTENSIONS;
  @Input() allowCaptions = false;
  @Input() sortOrder = 1;

  @Output() attachmentAdded = new EventEmitter<void>();

  uploading = false;
  uploadPercent = 0;
  isDragOver = false;

  isLoading$ = this.donationAttachmentService.isLoadingSubject.asObservable();

  private nextSortOrder = 1;
  private uploadFiles: File[] = [];
  private fileUploadStatus = new Map<string, TransferFileStatus>();

  constructor(
    private fileUploadService: FileUploadService,
    private donationAttachmentService: DonationAttachmentService,
    private transferProgressService: TransferProgressService,
    private localStorageService: LocalStorageService,
    private translate: TranslationService,
    private messageService: MessageService,
  ) { }

  ngOnDestroy(): void {
    this.transferProgressService.resetUploadProgress();
  }

  get canUpload(): boolean {
    return !this.disabled && !this.readonly && !this.uploading;
  }

  get allowedExtensionsLabel(): string {
    return this.allowedFileTypes.map((ext) => ext.toUpperCase()).join(', ');
  }

  get fileAcceptAttribute(): string {
    return this.allowedFileTypes.map((ext) => `.${ext}`).join(',');
  }

  get maxFileSizeLabel(): string {
    return String(this.maxFileSize / (1024 * 1024));
  }

  // #region File selection
  async onFilesSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files || []);
    input.value = '';
    await this.startUpload(files);
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    if (!this.canUpload) {
      return;
    }
    this.isDragOver = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
  }

  async onFileDrop(event: DragEvent): Promise<void> {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;

    if (!this.canUpload) {
      return;
    }
    await this.startUpload(Array.from(event.dataTransfer?.files || []));
  }

  private async startUpload(files: File[]): Promise<void> {
    if (!files.length || !this.canUpload) {
      return;
    }

    const storageLocation = getDonationStorageLocation(this.storageFolder);
    if (!storageLocation) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translate.getInstant('common.warning'),
        detail: this.translate.getInstant('donations.attachments.errors.locationNotConfigured'),
      });
      return;
    }

    if (!isDonationAttachmentOwnerTypeReady(this.ownerType)) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translate.getInstant('common.warning'),
        detail: this.translate.getInstant('donations.attachments.errors.invalidOwner'),
      });
      return;
    }

    if (!this.ownerId) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translate.getInstant('common.warning'),
        detail: this.translate.getInstant('donations.attachments.errors.invalidOwner'),
      });
      return;
    }

    this.nextSortOrder = Number(this.sortOrder) > 0 ? Number(this.sortOrder) : 1;

    const selected: File[] = [];
    for (const file of files.slice(0, this.maxFiles)) {
      if (!this.isAllowedFile(file)) {
        this.messageService.add({
          severity: 'error',
          summary: this.translate.getInstant('common.error'),
          detail: this.translate.getInstant('donations.attachments.errors.invalidFileType'),
        });
        continue;
      }

      if (file.size <= 0 || file.size > this.maxFileSize) {
        this.messageService.add({
          severity: 'error',
          summary: this.translate.getInstant('common.error'),
          detail: this.translate.getInstant('donations.attachments.errors.invalidFileSize'),
        });
        continue;
      }

      selected.push(file);
    }

    if (!selected.length) {
      return;
    }

    this.uploading = true;
    this.uploadPercent = 0;
    this.uploadFiles = selected;
    this.fileUploadStatus.clear();
    selected.forEach((file) => this.fileUploadStatus.set(file.name, 'pending'));
    this.syncUploadProgressOverlay();

    try {
      for (const file of selected) {
        await this.uploadAndLink(file, storageLocation.fileSystemId, storageLocation.folderId);
      }
    } finally {
      this.uploading = false;
      this.uploadPercent = 0;
      this.uploadFiles = [];
      this.fileUploadStatus.clear();
      this.transferProgressService.resetUploadProgress();
    }
  }
  // #endregion

  // #region Upload and link
  private async uploadAndLink(file: File, fileSystemId: number, folderId: number): Promise<void> {
    console.log('uploadAndLink', { file, fileSystemId, folderId });
    this.fileUploadStatus.set(file.name, 'uploading');
    this.syncUploadProgressOverlay();

    let uploaded: UploadedStorageFile | null = null;
    const currentSortOrder = this.nextSortOrder;
    let attachmentKind = Number(this.attachmentKind || 0);
    const totalFiles = this.uploadFiles.length || 1;

    try {
      const accessToken = this.localStorageService.getAccessToken();
      uploaded = await this.fileUploadService.uploadFileWithResult(
        file,
        accessToken,
        fileSystemId,
        BigInt(folderId),
        (percent) => {
          const completedFiles = Array.from(this.fileUploadStatus.values()).filter(
            (status) => status === 'completed',
          ).length;
          this.uploadPercent = Math.round(((completedFiles + percent / 100) / totalFiles) * 100);
          this.syncUploadProgressOverlay();
        },
      );

      const caption = String(file.name || '').trim() || `attachment_${currentSortOrder}`;
      attachmentKind = isDonationAttachmentKindReady(this.attachmentKind)
        ? Number(this.attachmentKind)
        : resolveDonationAttachmentKindFromFile(file);

      const response: any = await firstValueFrom(
        this.donationAttachmentService.addDonationAttachment({
          ownerType: Number(this.ownerType),
          ownerId: Number(this.ownerId),
          attachmentKind,
          fileId: uploaded.fileId,
          folderId: uploaded.folderId,
          fileSystemId: uploaded.fileSystemId,
          caption,
          isRegional: false,
          sortOrder: currentSortOrder,
        }),
      );

      console.log('addDonationAttachment response', response);

      if (!response?.success) {
        this.fileUploadStatus.set(file.name, 'error');
        this.syncUploadProgressOverlay();
        console.log('Donation attachment link failed after upload', {
          File_ID: uploaded.fileId,
          Folder_ID: uploaded.folderId,
          File_System_ID: uploaded.fileSystemId,
          Owner_Type: this.ownerType,
          Owner_ID: this.ownerId,
          Attachment_Kind: attachmentKind,
          response,
        });
        this.messageService.add({
          severity: 'warn',
          summary: this.translate.getInstant('common.warning'),
          detail: this.translate.getInstant('donations.attachments.messages.uploadLinkedFailed'),
        });
        this.handleBusinessError('add', response);
        return;
      }

      this.nextSortOrder = currentSortOrder + 1;
      this.fileUploadStatus.set(file.name, 'completed');
      this.syncUploadProgressOverlay();
      this.messageService.add({
        severity: 'success',
        summary: this.translate.getInstant('common.success'),
        detail: this.translate.getInstant('donations.attachments.messages.added'),
      });
      this.attachmentAdded.emit();
    } catch (error: any) {
      this.fileUploadStatus.set(file.name, 'error');
      this.syncUploadProgressOverlay();
      if (uploaded) {
        console.log('Donation attachment link failed after upload', {
          File_ID: uploaded.fileId,
          Folder_ID: uploaded.folderId,
          File_System_ID: uploaded.fileSystemId,
          Owner_Type: this.ownerType,
          Owner_ID: this.ownerId,
          Attachment_Kind: attachmentKind,
          error,
        });
        this.messageService.add({
          severity: 'warn',
          summary: this.translate.getInstant('common.warning'),
          detail: this.translate.getInstant('donations.attachments.messages.uploadLinkedFailed'),
        });
      } else {
        this.messageService.add({
          severity: 'error',
          summary: this.translate.getInstant('common.error'),
          detail:
            this.translate.getInstant('donations.attachments.errors.uploadFailed') ||
            String(error?.message || error?.errorCode || ''),
        });
      }
    }
  }

  private syncUploadProgressOverlay(): void {
    this.transferProgressService.setUploadProgress({
      visible: this.uploading,
      percent: this.uploadPercent,
      files: this.uploadFiles.map((file) => ({
        name: file.name,
        size: file.size,
        status: this.fileUploadStatus.get(file.name) || 'pending',
      })),
      blockInteraction: this.uploading,
    });
  }

  private isAllowedFile(file: File): boolean {
    const name = String(file.name || '').toLowerCase();
    const extension = name.includes('.') ? name.split('.').pop() || '' : '';
    return this.allowedFileTypes.map((item) => item.toLowerCase()).includes(extension);
  }

  private handleBusinessError(context: DonationAttachmentUploaderContext, response: any): void {
    const code = String(response?.message || '');
    let detail: string | null = null;

    switch (context) {
      case 'add':
        detail = this.getAddErrorMessage(code);
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

  private getAddErrorMessage(code: string): string | null {
    switch (code) {
      case 'DAP13008':
        return this.translate.getInstant('donations.attachments.errors.invalidOwner');
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
}
