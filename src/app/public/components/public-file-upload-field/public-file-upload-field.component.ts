import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormControl } from '@angular/forms';

@Component({
  standalone: false,
  selector: 'app-public-file-upload-field',
  templateUrl: './public-file-upload-field.component.html',
  styleUrl: './public-file-upload-field.component.scss',
})
export class PublicFileUploadFieldComponent {
  @Input() labelKey = '';
  @Input() hintKey = '';
  @Input() accept = '.pdf,.jpg,.jpeg,.png';
  @Input() control!: FormControl<File | null>;
  @Input() variant: 'dropzone' | 'inline' = 'dropzone';

  @Output() fileSelected = new EventEmitter<File | null>();

  fileName = '';

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.control.setValue(file);
    this.control.markAsTouched();
    this.fileName = file?.name ?? '';
    this.fileSelected.emit(file);
  }

  onBrowseClick(fileInput: HTMLInputElement): void {
    fileInput.click();
  }
}
