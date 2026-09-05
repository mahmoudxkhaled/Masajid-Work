import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MessageService } from 'primeng/api';
import { TranslationService } from 'src/app/core/services/translation.service';
import {
  DONATION_ATTACHMENT_ALLOWED_EXTENSIONS,
  DONATION_ATTACHMENT_MAX_FILE_SIZE_BYTES,
} from '../../models/donation-attachment.model';

@Component({
  standalone: false,
  selector: 'app-donation-attachment-pending-picker',
  templateUrl: './donation-attachment-pending-picker.component.html',
  styleUrl: './donation-attachment-pending-picker.component.scss',
})
export class DonationAttachmentPendingPickerComponent {
  @Input() files: File[] = [];
  @Input() disabled = false;
  @Input() maxFiles = 10;

  @Output() filesChange = new EventEmitter<File[]>();

  isDragOver = false;

  constructor(
    private translate: TranslationService,
    private messageService: MessageService,
  ) { }

  get canSelectFiles(): boolean {
    return !this.disabled;
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

  // #region File selection
  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files || []);
    input.value = '';
    this.addFiles(files);
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
    this.addFiles(Array.from(event.dataTransfer?.files || []));
  }

  removeFile(index: number): void {
    if (this.disabled) {
      return;
    }
    this.filesChange.emit(this.files.filter((_, i) => i !== index));
  }

  private addFiles(files: File[]): void {
    if (!this.canSelectFiles || !files.length) {
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

    if (!accepted.length) {
      return;
    }

    this.filesChange.emit([...this.files, ...accepted].slice(0, this.maxFiles));
  }
  // #endregion

  // #region File display
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
}
