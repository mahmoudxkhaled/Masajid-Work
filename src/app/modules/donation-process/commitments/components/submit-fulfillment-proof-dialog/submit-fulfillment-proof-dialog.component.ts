import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges } from '@angular/core';
import { MessageService } from 'primeng/api';
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
  DONATION_ATTACHMENT_ALLOWED_EXTENSIONS,
  DONATION_ATTACHMENT_MAX_FILE_SIZE_BYTES,
} from '../../../models/donation-attachment.model';
import {
  FulfilledBy,
  getFulfilledByOptions,
  isValidFulfilledBy,
} from '../../../models/fulfilled-by.model';
import { DonationFulfillmentService } from '../../../services/donation-fulfillment.service';

type SubmitFulfillmentProofDialogContext = 'submit' | 'upload';

@Component({
  standalone: false,
  selector: 'app-submit-fulfillment-proof-dialog',
  templateUrl: './submit-fulfillment-proof-dialog.component.html',
  styleUrl: './submit-fulfillment-proof-dialog.component.scss',
})
export class SubmitFulfillmentProofDialogComponent implements OnChanges, OnDestroy {
  @Input() visible = false;
  @Input() donationCommitmentId = 0;
  @Input() selectedVendorOfferId = 0;
  @Input() defaultFulfilledBy: number = FulfilledBy.Donor;

  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() submitted = new EventEmitter<number>();

  fulfilledBy: number = FulfilledBy.Donor;
  fulfillmentNote = '';
  selectedFiles: File[] = [];
  uploading = false;
  uploadPercent = 0;

  fulfilledByOptions: { value: number; label: string }[] = [];
  isDragOver = false;

  isLoading$ = this.donationFulfillmentService.isLoadingSubject.asObservable();

  private uploadFiles: File[] = [];
  private fileUploadStatus = new Map<string, TransferFileStatus>();
  private currentUploadingFileName: string | null = null;

  constructor(
    private donationFulfillmentService: DonationFulfillmentService,
    private fileUploadService: FileUploadService,
    private transferProgressService: TransferProgressService,
    private localStorageService: LocalStorageService,
    private translate: TranslationService,
    private messageService: MessageService,
  ) { }

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
    return isDonationStorageLocationReady('fulfillmentProofs');
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
    const mb = DONATION_ATTACHMENT_MAX_FILE_SIZE_BYTES / (1024 * 1024);
    return String(mb);
  }

  // #region Dialog
  closeDialog(): void {
    if (this.uploading) {
      return;
    }
    this.visible = false;
    this.visibleChange.emit(false);
    this.resetForm();
  }

  private resetForm(): void {
    this.fulfilledBy = isValidFulfilledBy(this.defaultFulfilledBy)
      ? this.defaultFulfilledBy
      : FulfilledBy.Donor;
    this.fulfillmentNote = '';
    this.selectedFiles = [];
    this.uploadFiles = [];
    this.fileUploadStatus.clear();
    this.currentUploadingFileName = null;
    this.uploading = false;
    this.uploadPercent = 0;
    this.isDragOver = false;
    this.transferProgressService.resetUploadProgress();
    this.fulfilledByOptions = getFulfilledByOptions().map((option) => ({
      value: option.value,
      label: this.translate.getInstant(option.labelKey),
    }));
  }
  // #endregion

  // #region File selection
  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files || []);
    input.value = '';
    this.addSelectedFiles(files);
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    if (!this.canSelectFiles) {
      return;
    }
    this.isDragOver = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
  }

  onFileDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;

    if (!this.canSelectFiles) {
      return;
    }

    const files = Array.from(event.dataTransfer?.files || []);
    this.addSelectedFiles(files);
  }

  removeFile(index: number): void {
    this.selectedFiles = this.selectedFiles.filter((_, i) => i !== index);
  }

  getFileIcon(file: File): string {
    const extension = this.getFileExtension(file);
    if (extension === 'pdf') {
      return 'pi pi-file-pdf';
    }
    if (extension === 'png' || extension === 'jpg' || extension === 'jpeg' || extension === 'webp') {
      return 'pi pi-image';
    }
    return 'pi pi-file';
  }

  formatFileSize(bytes: number): string {
    const size = Number(bytes) || 0;
    if (size < 1024) {
      return `${size} B`;
    }
    if (size < 1024 * 1024) {
      return `${(size / 1024).toFixed(1)} KB`;
    }
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }

  private addSelectedFiles(files: File[]): void {
    if (!files.length) {
      return;
    }

    const accepted: File[] = [];
    for (const file of files) {
      if (!this.isAllowedFile(file)) {
        this.messageService.add({
          severity: 'error',
          summary: this.translate.getInstant('common.error'),
          detail: this.translate.getInstant('donations.attachments.errors.invalidFileType'),
        });
        continue;
      }
      if (file.size <= 0 || file.size > DONATION_ATTACHMENT_MAX_FILE_SIZE_BYTES) {
        this.messageService.add({
          severity: 'error',
          summary: this.translate.getInstant('common.error'),
          detail: this.translate.getInstant('donations.attachments.errors.invalidFileSize'),
        });
        continue;
      }
      accepted.push(file);
    }

    this.selectedFiles = [...this.selectedFiles, ...accepted].slice(0, 10);
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
  // #endregion

  // #region Submit
  async confirmSubmit(): Promise<void> {
    if (this.uploading) {
      return;
    }

    if (!isValidFulfilledBy(this.fulfilledBy)) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translate.getInstant('common.warning'),
        detail: this.translate.getInstant(
          'donations.commitments.submitProofDialog.validation.fulfilledByRequired',
        ),
      });
      return;
    }

    if (this.fulfilledBy === FulfilledBy.Vendor && this.selectedVendorOfferId <= 0) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translate.getInstant('common.warning'),
        detail: this.translate.getInstant(
          'donations.commitments.submitProofDialog.validation.vendorOfferRequired',
        ),
      });
      return;
    }

    if (!this.selectedFiles.length) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translate.getInstant('common.warning'),
        detail: this.translate.getInstant(
          'donations.commitments.submitProofDialog.validation.proofRequired',
        ),
      });
      return;
    }

    const storageLocation = getDonationStorageLocation('fulfillmentProofs');
    if (!storageLocation) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translate.getInstant('common.warning'),
        detail: this.translate.getInstant('donations.attachments.errors.locationNotConfigured'),
      });
      return;
    }

    if (!this.donationCommitmentId) {
      return;
    }

    this.uploadFiles = this.selectedFiles.map((file, index) =>
      this.createTimestampedFile(file, index),
    );
    this.fileUploadStatus.clear();
    this.uploadFiles.forEach((file) => this.fileUploadStatus.set(file.name, 'pending'));

    this.uploading = true;
    this.uploadPercent = 0;
    this.syncUploadProgressOverlay();

    const uploadedFileIds: number[] = [];
    let uploadFileSystemId = storageLocation.fileSystemId;
    let uploadFolderId = storageLocation.folderId;
    const totalFiles = this.uploadFiles.length;

    try {
      const accessToken = this.localStorageService.getAccessToken();

      for (let i = 0; i < this.uploadFiles.length; i++) {
        const file = this.uploadFiles[i];
        this.currentUploadingFileName = file.name;
        this.fileUploadStatus.set(file.name, 'uploading');
        this.syncUploadProgressOverlay();

        const uploaded = await this.fileUploadService.uploadFileWithResult(
          file,
          accessToken,
          storageLocation.fileSystemId,
          BigInt(storageLocation.folderId),
          (percent) => {
            const completedFiles = Array.from(this.fileUploadStatus.values()).filter(
              (status) => status === 'completed',
            ).length;
            const currentFileProgress = percent / 100;
            this.uploadPercent = Math.round(
              ((completedFiles + currentFileProgress) / totalFiles) * 100,
            );
            this.syncUploadProgressOverlay();
          },
        );

        uploadedFileIds.push(uploaded.fileId);
        uploadFileSystemId = uploaded.fileSystemId;
        uploadFolderId = uploaded.folderId;
        this.fileUploadStatus.set(file.name, 'completed');
        this.currentUploadingFileName = null;
        this.syncUploadProgressOverlay();
      }
    } catch (err: unknown) {
      console.error('Fulfillment proof upload failed', err);
      if (this.currentUploadingFileName) {
        this.fileUploadStatus.set(this.currentUploadingFileName, 'error');
        this.currentUploadingFileName = null;
        this.syncUploadProgressOverlay();
      }
      const response = this.normalizeUploadError(err);
      this.handleBusinessError('upload', response);
      this.uploading = false;
      this.syncUploadProgressOverlay();
      return;
    }

    this.uploading = false;
    this.transferProgressService.resetUploadProgress();

    if (!uploadedFileIds.length) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translate.getInstant('common.warning'),
        detail: this.translate.getInstant(
          'donations.commitments.submitProofDialog.validation.proofRequired',
        ),
      });
      return;
    }

    const payload = {
      donationCommitmentId: this.donationCommitmentId,
      fulfilledBy: this.fulfilledBy,
      donationVendorOfferId: this.selectedVendorOfferId > 0 ? this.selectedVendorOfferId : 0,
      fulfillmentNote: String(this.fulfillmentNote || '').trim(),
      isRegional: this.localStorageService.isRegionalApiInput(),
      attachmentFileIds: uploadedFileIds,
      fileSystemId: uploadFileSystemId,
      folderId: uploadFolderId,
    };

    console.log('submitFulfillmentProof params', payload);

    this.donationFulfillmentService.submitFulfillmentProof(payload).subscribe({
      next: (response: any) => {
        console.log('submitFulfillmentProof response', response);
        if (!response?.success) {
          console.log('Fulfillment proof submit failed after upload', {
            Donation_Commitment_ID: payload.donationCommitmentId,
            Fulfilled_By: payload.fulfilledBy,
            Donation_Vendor_Offer_ID: payload.donationVendorOfferId,
            File_IDs: payload.attachmentFileIds,
            File_System_ID: payload.fileSystemId,
            Folder_ID: payload.folderId,
            response,
          });
          this.messageService.add({
            severity: 'warn',
            summary: this.translate.getInstant('common.warning'),
            detail: this.translate.getInstant(
              'donations.commitments.messages.fulfillmentSubmitAfterUploadFailed',
            ),
          });
          this.handleBusinessError('submit', response);
          return;
        }

        const fulfillmentId = this.donationFulfillmentService.extractFulfillmentId(response.message);
        this.messageService.add({
          severity: 'success',
          summary: this.translate.getInstant('common.success'),
          detail: this.translate.getInstant('donations.commitments.messages.fulfillmentSubmitted'),
        });
        this.closeDialog();
        this.submitted.emit(fulfillmentId);
      },
    });
  }
  // #endregion

  // #region Upload helpers
  private createTimestampedFile(file: File, index: number): File {
    const lastDot = file.name.lastIndexOf('.');
    const baseName = lastDot > 0 ? file.name.substring(0, lastDot) : file.name;
    const extension = lastDot > 0 ? file.name.substring(lastDot) : '';
    const timestampedName = `${baseName}_${Date.now()}_${index}${extension}`;
    return new File([file], timestampedName, {
      type: file.type,
      lastModified: file.lastModified,
    });
  }

  private getFileUploadStatus(fileName: string): TransferFileStatus {
    return this.fileUploadStatus.get(fileName) || 'pending';
  }

  private syncUploadProgressOverlay(): void {
    const files = this.uploadFiles.map((file) => ({
      name: file.name,
      size: file.size,
      status: this.getFileUploadStatus(file.name),
    }));
    this.transferProgressService.setUploadProgress({
      visible: this.uploading,
      percent: this.uploadPercent,
      files,
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
    if (typeof e['error'] === 'string') {
      return { message: e['error'] };
    }
    return e;
  }
  // #endregion

  // #region Errors
  private handleBusinessError(context: SubmitFulfillmentProofDialogContext, response: any): void {
    const code = String(response?.message || '');
    let detail: string | null = null;

    switch (context) {
      case 'upload':
        detail = this.getStorageApiErrorMessage(code) ?? this.getNonCodeErrorDetail(response);
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

  private getSubmitErrorMessage(code: string): string | null {
    switch (code) {
      case 'DAP13003':
        return this.translate.getInstant('donations.commitments.errors.commitmentNotFound');
      case 'DAP13014':
        return this.translate.getInstant('donations.commitments.errors.submitProofNotDonor');
      case 'DAP13029':
        return this.translate.getInstant('donations.commitments.errors.proofRequired');
      case 'DAP13010':
        return this.translate.getInstant('donations.commitments.errors.invalidFulfillmentStatus');
      case 'DAP11055':
        return this.translate.getInstant('donations.commitments.errors.accessDeniedAction');
      case 'DAP11040':
      case 'DAP11041':
      case 'DAP11042':
        return this.translate.getInstant('donations.commitments.errors.sessionExpired');
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
      case 'DAP12293':
        return this.translate.getInstant('fileSystem.admin.errorInvalidAccessType');
      case 'DAP12294':
        return this.translate.getInstant('fileSystem.admin.errorInvalidAccessRight');
      case 'DAP12296':
        return this.translate.getInstant('fileSystem.admin.errorInvalidAccountId');
      case 'DAP12297':
        return this.translate.getInstant('fileSystem.admin.errorOwnerOrFullRequired');
      case 'DAP12298':
        return this.translate.getInstant('fileSystem.admin.errorActionNotAllowedOnReferenceAllocation');
      case 'DAP12299':
        return this.translate.getInstant('fileSystem.admin.errorActionNotAllowedOnCopyAllocation');
      case 'DAP12220':
        return this.translate.getInstant('fileSystem.admin.errorInvalidFileName');
      case 'DAP12221':
        return this.translate.getInstant('fileSystem.admin.errorInvalidFileType');
      case 'DAP12222':
        return this.translate.getInstant('fileSystem.admin.errorInvalidDateFormat');
      case 'DAP12223':
        return this.translate.getInstant('fileSystem.admin.errorInvalidFileSize');
      case 'DAP12224':
        return this.translate.getInstant('fileSystem.admin.errorInvalidNChunks');
      case 'DAP12225':
        return this.translate.getInstant('fileSystem.admin.errorNChunksMismatch');
      case 'DAP12226':
        return this.translate.getInstant('fileSystem.admin.errorInsufficientStorage');
      case 'DAP12227':
        return this.translate.getInstant('fileSystem.admin.errorFileExistsInFolder');
      case 'DAP12228':
        return this.translate.getInstant('fileSystem.admin.errorInvalidChunkSize');
      case 'DAP12230':
        return this.translate.getInstant('fileSystem.admin.errorInvalidUploadToken');
      case 'DAP12231':
        return this.translate.getInstant('fileSystem.admin.errorInvalidChunkId');
      case 'DAP12232':
        return this.translate.getInstant('fileSystem.admin.errorInvalidOffset');
      case 'DAP12233':
        return this.translate.getInstant('fileSystem.admin.errorNoChunksReceived');
      case 'DAP12234':
        return this.translate.getInstant('fileSystem.admin.errorChunkEmpty');
      case 'DAP12235':
        return this.translate.getInstant('fileSystem.admin.errorChunkHashEmpty');
      case 'DAP12236':
        return this.translate.getInstant('fileSystem.admin.errorChunkHashInvalid');
      case 'DAP12237':
        return this.translate.getInstant('fileSystem.admin.errorFileStorage');
      case 'DAP12248':
        return this.translate.getInstant('fileSystem.admin.errorInvalidEntityFilter');
      case 'DAP12251':
      case 'DAP12252':
        return this.translate.getInstant('fileSystem.admin.errorInvalidFileSystemName');
      case 'DAP12255':
        return this.translate.getInstant('fileSystem.admin.errorFileSystemInUse');
      case 'DAP12267':
        return this.translate.getInstant('fileSystem.folderManagement.errorInvalidRestoreSelection');
      case 'DAP12263':
        return this.translate.getInstant('fileSystem.admin.errorInvalidFileAllocationType');
      case 'FWA12251':
      case 'FWA12252':
        return this.translate.getInstant('fileSystem.admin.errorInvalidFileSystemName');
      case 'FWA12255':
        return this.translate.getInstant('fileSystem.admin.errorFileSystemInUse');
      default:
        return null;
    }
  }
  // #endregion
}
