import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type TransferFileStatus = 'pending' | 'uploading' | 'completed' | 'error';

export interface UploadProgressItem {
  name: string;
  size: number;
  status: TransferFileStatus;
}

export interface UploadProgressState {
  visible: boolean;
  percent: number;
  files: UploadProgressItem[];
}

export interface DownloadProgressState {
  visible: boolean;
  percent: number;
  fileName: string | null;
  fileSizeBytes: number;
  remainingBytes: number;
}

@Injectable({
  providedIn: 'root',
})
export class TransferProgressService {
  private readonly uploadProgressSubject = new BehaviorSubject<UploadProgressState>({
    visible: false,
    percent: 0,
    files: [],
  });

  private readonly downloadProgressSubject = new BehaviorSubject<DownloadProgressState>({
    visible: false,
    percent: 0,
    fileName: null,
    fileSizeBytes: 0,
    remainingBytes: 0,
  });

  readonly uploadProgress$ = this.uploadProgressSubject.asObservable();
  readonly downloadProgress$ = this.downloadProgressSubject.asObservable();

  setUploadProgress(state: UploadProgressState): void {
    this.uploadProgressSubject.next(state);
  }

  resetUploadProgress(): void {
    this.uploadProgressSubject.next({
      visible: false,
      percent: 0,
      files: [],
    });
  }

  setDownloadProgress(state: DownloadProgressState): void {
    this.downloadProgressSubject.next(state);
  }

  hideDownloadProgress(): void {
    const current = this.downloadProgressSubject.value;
    this.downloadProgressSubject.next({
      ...current,
      visible: false,
    });
  }

  resetDownloadProgress(): void {
    this.downloadProgressSubject.next({
      visible: false,
      percent: 0,
      fileName: null,
      fileSizeBytes: 0,
      remainingBytes: 0,
    });
  }
}
