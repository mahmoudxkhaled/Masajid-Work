import { Component } from '@angular/core';
import { Observable } from 'rxjs';
import {
  DownloadProgressState,
  TransferProgressService,
  UploadProgressState,
} from 'src/app/core/file-system-lib/services/transfer-progress.service';

@Component({
  selector: 'app-transfer-progress-overlay',
  templateUrl: './transfer-progress-overlay.component.html',
  styleUrls: ['./transfer-progress-overlay.component.scss'],
})
export class TransferProgressOverlayComponent {
  uploadProgressState$: Observable<UploadProgressState>;
  downloadProgressState$: Observable<DownloadProgressState>;

  constructor(private transferProgressService: TransferProgressService) {
    this.uploadProgressState$ = this.transferProgressService.uploadProgress$;
    this.downloadProgressState$ = this.transferProgressService.downloadProgress$;
  }

  hideDownloadProgress(): void {
    this.transferProgressService.hideDownloadProgress();
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  formatBytes(bytes: number): string {
    if (bytes <= 0) return '0 B';
    const gb = bytes / (1024 * 1024 * 1024);
    if (gb >= 1) return gb.toFixed(2) + ' GB';
    const mb = bytes / (1024 * 1024);
    return mb >= 1 ? mb.toFixed(2) + ' MB' : (bytes / 1024).toFixed(2) + ' KB';
  }
}
