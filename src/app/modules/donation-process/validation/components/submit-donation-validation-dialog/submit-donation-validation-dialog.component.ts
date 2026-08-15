import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges } from '@angular/core';
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
  getDonationStorageLocation,
  isDonationStorageLocationReady,
} from '../../../config/donation-storage.config';
import {
  resolveDonationAttachmentKindFromFileName,
  resolveValidationAttachmentOwner,
} from '../../../models/donation-attachment.constants';
import {
  DONATION_ATTACHMENT_ALLOWED_EXTENSIONS,
  DONATION_ATTACHMENT_MAX_FILE_SIZE_BYTES,
} from '../../../models/donation-attachment.model';
import {
  DonationValidationResult,
  isValidDonationValidationResult,
} from '../../../models/donation-validation-result.model';
import { DonationAttachmentService } from '../../../services/donation-attachment.service';
import { DonationValidationService } from '../../services/donation-validation.service';

type SubmitDonationValidationDialogContext = 'submit' | 'upload' | 'link';

@Component({
  standalone: false,
  selector: 'app-submit-donation-validation-dialog',
  templateUrl: './submit-donation-validation-dialog.component.html',
  styleUrl: './submit-donation-validation-dialog.component.scss',
})
export class SubmitDonationValidationDialogComponent implements OnChanges, OnDestroy {
  @Input() visible = false;
  @Input() donationRequestId = 0;
  @Input() donationFulfillmentId = 0;

  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() submitted = new EventEmitter<number>();

  readonly DonationValidationResult = DonationValidationResult;
  validationResult: number = DonationValidationResult.Confirm;
  notes = '';
  selectedFiles: File[] = [];
  uploading = false;
  uploadPercent = 0;
  isDragOver = false;

  isLoading$ = this.donationValidationService.isLoadingSubject.asObservable();

  private uploadFiles: File[] = [];
  private fileUploadStatus = new Map<string, TransferFileStatus>();
  private currentUploadingFileName: string | null = null;

  constructor(
    private donationValidationService: DonationValidationService,
    private donationAttachmentService: DonationAttachmentService,
    private fileUploadService: FileUploadService,
    private transferProgressService: TransferProgressService,
    private localStorageService: LocalStorageService,
    private translate: TranslationService,
    private messageService: MessageService,
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible'] && this.visible) {
      this.resetForm();
    }
  }

  ngOnDestroy(): void {
    this.transferProgressService.resetUploadProgress();
  }

  get busy(): boolean {
    return this.uploading;
  }

  get storageConfigured(): boolean {
    return isDonationStorageLocationReady('communityValidations');
  }

  get canSelectFiles(): boolean {
    return !this.busy && this.storageConfigured;
  }

  get allowedExtensionsLabel(): string {
    return DONATION_ATTACHMENT_ALLOWED_EXTENSIONS.map((ext) => ext.toUpperCase()).join(', ');
  }

  get fileAcceptAttribute(): string {
    return DONATION_ATTACHMENT_ALLOWED_EXTENSIONS.map((ext) => `.${ext}`).join(',');
  }

  get maxFileSizeLabel(): string {
    return String(DONATION_ATTACHMENT_MAX_FILE_SIZE_BYTES / (1024 * 1024));
  }

  closeDialog(): void {
    if (this.uploading) {
      return;
    }
    this.visible = false;
    this.visibleChange.emit(false);
    this.resetForm();
  }

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.addFiles(Array.from(input.files || []));
    input.value = '';
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    if (!this.canSelectFiles) {
      return;
    }
    this.isDragOver = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver = false;
  }

  onFileDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver = false;
    if (!this.canSelectFiles) {
      return;
    }
    this.addFiles(Array.from(event.dataTransfer?.files || []));
  }

  removeFile(index: number): void {
    if (this.busy) {
      return;
    }
    this.selectedFiles = this.selectedFiles.filter((_, i) => i !== index);
  }

  getFileIcon(file: File): string {
    const ext = this.getFileExtension(file);
    if (ext === 'pdf') {
      return 'pi pi-file-pdf text-red-500';
    }
    if (['png', 'jpg', 'jpeg', 'webp'].includes(ext)) {
      return 'pi pi-image text-primary';
    }
    return 'pi pi-file text-500';
  }

  formatFileSize(size: number): string {
    if (size < 1024) {
      return `${size} B`;
    }
    if (size < 1024 * 1024) {
      return `${(size / 1024).toFixed(1)} KB`;
    }
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }

  async confirmSubmit(): Promise<void> {
    if (this.uploading) {
      return;
    }

    if (!isValidDonationValidationResult(this.validationResult)) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translate.getInstant('common.warning'),
        detail: this.translate.getInstant(
          'donations.validation.submitDialog.validation.decisionRequired',
        ),
      });
      return;
    }

    const trimmedNotes = String(this.notes || '').trim();
    if (this.validationResult === DonationValidationResult.Dispute && !trimmedNotes) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translate.getInstant('common.warning'),
        detail: this.translate.getInstant(
          'donations.validation.submitDialog.validation.noteRequiredForDispute',
        ),
      });
      return;
    }

    if (!this.donationRequestId || !this.donationFulfillmentId) {
      return;
    }

    const storageLocation = getDonationStorageLocation('communityValidations');
    if (!storageLocation && this.selectedFiles.length) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translate.getInstant('common.warning'),
        detail: this.translate.getInstant('donations.attachments.errors.locationNotConfigured'),
      });
      return;
    }

    const validationAttachmentIds: number[] = [];
    let uploadFileSystemId = storageLocation?.fileSystemId || 0;
    let uploadFolderId = storageLocation?.folderId || 0;

    if (this.selectedFiles.length) {
      this.uploadFiles = this.selectedFiles.map((file, index) =>
        this.createTimestampedFile(file, index),
      );
      this.fileUploadStatus.clear();
      this.uploadFiles.forEach((file) => this.fileUploadStatus.set(file.name, 'pending'));
      this.uploading = true;
      this.uploadPercent = 0;
      this.syncUploadProgressOverlay();

      const owner = resolveValidationAttachmentOwner(this.donationRequestId);
      const accessToken = this.localStorageService.getAccessToken();
      const totalFiles = this.uploadFiles.length;

      for (let i = 0; i < this.uploadFiles.length; i++) {
        const file = this.uploadFiles[i];
        let linkingFile = false;
        this.currentUploadingFileName = file.name;
        this.fileUploadStatus.set(file.name, 'uploading');
        this.syncUploadProgressOverlay();

        try {
          const uploaded = await this.fileUploadService.uploadFileWithResult(
            file,
            accessToken,
            storageLocation!.fileSystemId,
            BigInt(storageLocation!.folderId),
            (percent) => {
              const completedFiles = Array.from(this.fileUploadStatus.values()).filter(
                (status) => status === 'completed',
              ).length;
              this.uploadPercent = Math.round(
                ((completedFiles + percent / 100) / totalFiles) * 100,
              );
              this.syncUploadProgressOverlay();
            },
          );

          uploadFileSystemId = uploaded.fileSystemId;
          uploadFolderId = uploaded.folderId;
          linkingFile = true;

          const caption =
            String(this.selectedFiles[i]?.name || file.name || uploaded.fileName || '').trim() ||
            `validation_${i + 1}`;

          const linkResponse: any = await firstValueFrom(
            this.donationAttachmentService.addDonationAttachment({
              ownerType: owner.ownerType,
              ownerId: owner.ownerId,
              attachmentKind: resolveDonationAttachmentKindFromFileName(caption),
              fileId: uploaded.fileId,
              folderId: uploaded.folderId,
              fileSystemId: uploaded.fileSystemId,
              caption,
              isRegional: this.localStorageService.isRegionalApiInput(),
              sortOrder: i + 1,
            }),
          );

          console.log('addDonationAttachment response', linkResponse);

          if (!linkResponse?.success) {
            this.fileUploadStatus.set(file.name, 'error');
            this.currentUploadingFileName = null;
            this.syncUploadProgressOverlay();
            this.messageService.add({
              severity: 'warn',
              summary: this.translate.getInstant('common.warning'),
              detail: this.translate.getInstant('donations.attachments.messages.uploadLinkedFailed'),
            });
            this.handleBusinessError('link', linkResponse);
            this.uploading = false;
            this.syncUploadProgressOverlay();
            return;
          }

          const donationAttachmentId =
            this.donationAttachmentService.extractDonationAttachmentId(linkResponse.message);
          if (!donationAttachmentId) {
            this.fileUploadStatus.set(file.name, 'error');
            this.currentUploadingFileName = null;
            this.syncUploadProgressOverlay();
            this.messageService.add({
              severity: 'warn',
              summary: this.translate.getInstant('common.warning'),
              detail: this.translate.getInstant('donations.attachments.messages.uploadLinkedFailed'),
            });
            this.uploading = false;
            this.syncUploadProgressOverlay();
            return;
          }

          validationAttachmentIds.push(donationAttachmentId);
          this.fileUploadStatus.set(file.name, 'completed');
          this.currentUploadingFileName = null;
          this.syncUploadProgressOverlay();
        } catch (err: unknown) {
          console.error('Validation attachment upload/link failed', err);
          if (this.currentUploadingFileName) {
            this.fileUploadStatus.set(this.currentUploadingFileName, 'error');
            this.currentUploadingFileName = null;
            this.syncUploadProgressOverlay();
          }
          const response = this.normalizeUploadError(err);
          if (linkingFile) {
            this.messageService.add({
              severity: 'warn',
              summary: this.translate.getInstant('common.warning'),
              detail: this.translate.getInstant('donations.attachments.messages.uploadLinkedFailed'),
            });
            this.handleBusinessError('link', response);
          } else {
            this.handleBusinessError('upload', response);
          }
          this.uploading = false;
          this.syncUploadProgressOverlay();
          return;
        }
      }

      this.uploading = false;
      this.transferProgressService.resetUploadProgress();

      if (this.selectedFiles.length && !validationAttachmentIds.length) {
        return;
      }
    }

    const payload = {
      donationFulfillmentId: this.donationFulfillmentId,
      validationResult: this.validationResult,
      notes: trimmedNotes,
      isRegional: this.localStorageService.isRegionalApiInput(),
      validationAttachmentIds,
      fileSystemId: uploadFileSystemId,
      folderId: uploadFolderId,
    };

    console.log('submitDonationValidation params', payload);

    this.donationValidationService.submitDonationValidation(payload).subscribe({
      next: (response: any) => {
        console.log('submitDonationValidation response', response);
        if (!response?.success) {
          console.log('Validation submit failed after upload/link', {
            Donation_Fulfillment_ID: payload.donationFulfillmentId,
            Donation_Attachment_IDs: payload.validationAttachmentIds,
            Validation_Result: payload.validationResult,
            File_System_ID: payload.fileSystemId,
            Folder_ID: payload.folderId,
            response,
          });
          if (validationAttachmentIds.length) {
            this.messageService.add({
              severity: 'warn',
              summary: this.translate.getInstant('common.warning'),
              detail: this.translate.getInstant(
                'donations.validation.messages.submitAfterUploadFailed',
              ),
            });
          }
          this.handleBusinessError('submit', response);
          return;
        }

        const validationId = this.donationValidationService.extractValidationId(response.message);
        this.messageService.add({
          severity: 'success',
          summary: this.translate.getInstant('common.success'),
          detail: this.translate.getInstant('donations.validation.messages.submitted'),
        });
        this.closeDialog();
        this.submitted.emit(validationId);
      },
    });
  }

  private resetForm(): void {
    this.validationResult = DonationValidationResult.Confirm;
    this.notes = '';
    this.selectedFiles = [];
    this.uploadFiles = [];
    this.fileUploadStatus.clear();
    this.currentUploadingFileName = null;
    this.uploading = false;
    this.uploadPercent = 0;
    this.isDragOver = false;
    this.transferProgressService.resetUploadProgress();
  }

  private addFiles(files: File[]): void {
    if (!this.canSelectFiles || !files.length) {
      return;
    }
    const accepted: File[] = [];
    for (const file of files) {
      if (!this.isAllowedFile(file) || file.size <= 0 || file.size > DONATION_ATTACHMENT_MAX_FILE_SIZE_BYTES) {
        continue;
      }
      accepted.push(file);
    }
    this.selectedFiles = [...this.selectedFiles, ...accepted].slice(0, 10);
  }

  private createTimestampedFile(file: File, index: number): File {
    const lastDot = file.name.lastIndexOf('.');
    const baseName = lastDot > 0 ? file.name.substring(0, lastDot) : file.name;
    const extension = lastDot > 0 ? file.name.substring(lastDot) : '';
    return new File([file], `${baseName}_${Date.now()}_${index}${extension}`, {
      type: file.type,
      lastModified: file.lastModified,
    });
  }

  private getFileExtension(file: File): string {
    const name = String(file.name || '');
    return name.includes('.') ? name.split('.').pop()?.toLowerCase() || '' : '';
  }

  private isAllowedFile(file: File): boolean {
    return (DONATION_ATTACHMENT_ALLOWED_EXTENSIONS as readonly string[]).includes(
      this.getFileExtension(file),
    );
  }

  private getFileUploadStatus(fileName: string): TransferFileStatus {
    return this.fileUploadStatus.get(fileName) || 'pending';
  }

  private syncUploadProgressOverlay(): void {
    this.transferProgressService.setUploadProgress({
      visible: this.uploading,
      percent: this.uploadPercent,
      files: this.uploadFiles.map((file) => ({
        name: file.name,
        size: file.size,
        status: this.getFileUploadStatus(file.name),
      })),
      blockInteraction: this.uploading,
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
    return e;
  }

  private handleBusinessError(context: SubmitDonationValidationDialogContext, response: any): void {
    const code = String(response?.message || '');
    let detail: string | null = null;

    switch (context) {
      case 'upload':
        detail = this.translate.getInstant('donations.attachments.errors.uploadFailed');
        break;
      case 'link':
        detail = this.getLinkErrorMessage(code);
        break;
      case 'submit':
        detail = this.getSubmitErrorMessage(code);
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

  private getLinkErrorMessage(code: string): string | null {
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

  private getSubmitErrorMessage(code: string): string | null {
    switch (code) {
      case 'DAP13005':
        return this.translate.getInstant('donations.validation.errors.fulfillmentNotFound');
      case 'DAP13027':
        return this.translate.getInstant('donations.validation.errors.invalidValidationResult');
      case 'DAP13028':
        return this.translate.getInstant('donations.validation.errors.validationNotOpen');
      case 'DAP13000':
        return this.translate.getInstant('donations.validation.errors.requestNotFound');
      case 'DAP13010':
        return this.translate.getInstant('donations.validation.errors.invalidStatus');
      case 'DAP13033':
        return this.translate.getInstant('donations.validation.errors.actionNotAccessible');
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
