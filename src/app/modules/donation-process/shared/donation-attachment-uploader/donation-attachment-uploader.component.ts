import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MessageService } from 'primeng/api';
import { firstValueFrom } from 'rxjs';
import { FileUploadService } from 'src/app/core/file-system-lib/services/file-upload.service';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';
import { TranslationService } from 'src/app/core/services/translation.service';
import {
  DonationStorageFolderKey,
  getDonationStorageLocation,
} from '../../config/donation-storage.config';
import {
  isDonationAttachmentKindReady,
  isDonationAttachmentOwnerTypeReady,
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
export class DonationAttachmentUploaderComponent {
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

  isLoading$ = this.donationAttachmentService.isLoadingSubject.asObservable();

  private nextSortOrder = 1;

  constructor(
    private fileUploadService: FileUploadService,
    private donationAttachmentService: DonationAttachmentService,
    private localStorageService: LocalStorageService,
    private translate: TranslationService,
    private messageService: MessageService,
  ) { }

  get canUpload(): boolean {
    return !this.disabled && !this.readonly && !this.uploading;
  }

  async onFilesSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files || []);
    input.value = '';

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

    if (!isDonationAttachmentOwnerTypeReady(this.ownerType) || !isDonationAttachmentKindReady(this.attachmentKind)) {
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

    const selected = files.slice(0, this.maxFiles);
    for (const file of selected) {
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

      await this.uploadAndLink(file, storageLocation.fileSystemId, storageLocation.folderId);
    }
  }

  private async uploadAndLink(file: File, fileSystemId: number, folderId: number): Promise<void> {
    console.log('uploadAndLink', { file, fileSystemId, folderId });
    this.uploading = true;
    this.uploadPercent = 0;

    let uploaded: UploadedStorageFile | null = null;
    const currentSortOrder = this.nextSortOrder;

    try {
      const accessToken = this.localStorageService.getAccessToken();
      uploaded = await this.fileUploadService.uploadFileWithResult(
        file,
        accessToken,
        fileSystemId,
        BigInt(folderId),
        (percent) => {
          this.uploadPercent = Math.round(percent);
        },
      );

      const caption = String(file.name || '').trim() || `attachment_${currentSortOrder}`;

      const response: any = await firstValueFrom(
        this.donationAttachmentService.addDonationAttachment({
          ownerType: Number(this.ownerType),
          ownerId: Number(this.ownerId),
          attachmentKind: Number(this.attachmentKind),
          fileId: uploaded.fileId,
          folderId: uploaded.folderId,
          fileSystemId: uploaded.fileSystemId,
          caption,
          isRegional: this.localStorageService.isRegionalApiInput(),
          sortOrder: currentSortOrder,
        }),
      );

      console.log('addDonationAttachment response', response);

      if (!response?.success) {
        console.log('Donation attachment link failed after upload', {
          File_ID: uploaded.fileId,
          Folder_ID: uploaded.folderId,
          File_System_ID: uploaded.fileSystemId,
          Owner_Type: this.ownerType,
          Owner_ID: this.ownerId,
          Attachment_Kind: this.attachmentKind,
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
      this.messageService.add({
        severity: 'success',
        summary: this.translate.getInstant('common.success'),
        detail: this.translate.getInstant('donations.attachments.messages.added'),
      });
      this.attachmentAdded.emit();
    } catch (error: any) {
      if (uploaded) {
        console.log('Donation attachment link failed after upload', {
          File_ID: uploaded.fileId,
          Folder_ID: uploaded.folderId,
          File_System_ID: uploaded.fileSystemId,
          Owner_Type: this.ownerType,
          Owner_ID: this.ownerId,
          Attachment_Kind: this.attachmentKind,
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
    } finally {
      this.uploading = false;
      this.uploadPercent = 0;
    }
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
