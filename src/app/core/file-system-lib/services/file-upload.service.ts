import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { ApiService } from '../../api/api.service';
import { sha256FromUint8 } from '../utils/hash.util';
import {
  UploadSession,
  clearUploadSession,
  getUploadSession,
  saveUploadSession,
  updateUploadedChunk,
} from '../utils/upload-session.util';

/** Request code for Upload_Request (Files Basic). */
const UPLOAD_REQUEST_CODE = 1101;

@Injectable({
  providedIn: 'root',
})
export class FileUploadService {
  private readonly apiService = inject(ApiService);
  private readonly http = inject(HttpClient);

  async uploadFile(
    file: File,
    accessToken: string,
    fileSystemId: number,
    folderId: bigint,
    onProgress?: (percent: number) => void
  ): Promise<void> {
    await this.uploadFileInternal(
      file,
      accessToken,
      fileSystemId,
      folderId,
      onProgress,
      false
    );
  }

  private async uploadFileInternal(
    file: File,
    accessToken: string,
    fileSystemId: number,
    folderId: bigint,
    onProgress: ((percent: number) => void) | undefined,
    hasRetriedForToken: boolean
  ): Promise<void> {
    const chunkSize = (1024 * 1024) / 4;
    const totalBytes = file.size;
    const totalChunks = Math.ceil(totalBytes / chunkSize);

    const fileName = file.name;
    const fileSize = file.size;
    const lastModified = file.lastModified;

    let session: UploadSession | null = getUploadSession(
      fileName,
      fileSize,
      lastModified,
      fileSystemId,
      folderId
    );

    let uploadToken: string | null = null;
    let startChunk = 1;
    let alreadyUploadedBytes = 0;

    if (
      session &&
      session.chunkSize === chunkSize &&
      session.totalChunks === totalChunks
    ) {
      uploadToken = session.uploadToken;
      startChunk = session.lastUploadedChunkIndex + 1;
      alreadyUploadedBytes = Math.min(
        session.lastUploadedChunkIndex * chunkSize,
        totalBytes
      );
    } else if (session) {
      clearUploadSession(fileName, fileSize, lastModified, fileSystemId, folderId);
      session = null;
    }

    if (!uploadToken) {
      uploadToken = await this.requestUploadToken(
        file,
        accessToken,
        fileSystemId,
        folderId,
        totalChunks,
        chunkSize
      );

      const newSession: UploadSession = {
        fileName,
        fileSize,
        lastModified,
        fileSystemId,
        folderId: folderId.toString(),
        uploadToken,
        chunkSize,
        totalChunks,
        lastUploadedChunkIndex: 0,
      };

      saveUploadSession(newSession);
      startChunk = 1;
      alreadyUploadedBytes = 0;
    }

    if (startChunk > totalChunks) {
      clearUploadSession(fileName, fileSize, lastModified, fileSystemId, folderId);

      if (onProgress) {
        onProgress(100);
      }

      return;
    }

    try {
      await this.uploadFileChunks(
        file,
        uploadToken,
        chunkSize,
        totalBytes,
        fileSystemId,
        folderId,
        lastModified,
        startChunk,
        alreadyUploadedBytes,
        onProgress
      );
    } catch (error: any) {
      if (!hasRetriedForToken && this.isTokenInvalidError(error)) {
        clearUploadSession(fileName, fileSize, lastModified, fileSystemId, folderId);

        await this.uploadFileInternal(
          file,
          accessToken,
          fileSystemId,
          folderId,
          onProgress,
          true
        );

        return;
      }

      throw error;
    }
  }

  private async requestUploadToken(
    file: File,
    accessToken: string,
    fileSystemId: number,
    folderId: bigint,
    totalChunks: number,
    chunkSize: number
  ): Promise<string> {
    const parameters: string[] = [
      file.name,
      file.type,
      new Date(file.lastModified).toString(),
      file.size.toString(),
      totalChunks.toString(),
      chunkSize.toString(),
      fileSystemId.toString(),
      folderId.toString(),
    ];

    const response = (await firstValueFrom(
      this.apiService.callAPI(UPLOAD_REQUEST_CODE, accessToken, parameters)
    )) as unknown as { success: boolean; message: string };

    console.log('Upload_Request response:', response);

    if (!response?.success || !response?.message) {
      // Throw a response-like object so UI can map ERP error codes (e.g. ERP12227) using getFileSystemErrorDetail.
      throw {
        errorCode: response?.message,
        message: response?.message || 'Upload request failed.',
      };
    }

    return response.message;
  }

  private async uploadFileChunks(
    file: File,
    uploadToken: string,
    chunkSize: number,
    totalBytes: number,
    fileSystemId: number,
    folderId: bigint,
    lastModified: number,
    startChunk: number,
    alreadyUploadedBytes: number,
    onProgress?: (percent: number) => void
  ): Promise<void> {
    let offset = alreadyUploadedBytes;
    let currentChunk = startChunk;

    while (offset < totalBytes) {
      const nextOffset = Math.min(offset + chunkSize, totalBytes);
      const chunk = file.slice(offset, nextOffset);

      const formData = new FormData();
      formData.append('current_chunk', currentChunk.toString());
      formData.append('offset', offset.toString());
      formData.append('file_chunk', chunk, file.name);

      const hash = await sha256FromUint8(await chunk.arrayBuffer());
      formData.append('hash', hash);

      let attempt = 0;
      let uploaded = false;

      while (!uploaded) {
        attempt++;

        try {
          const chunkResponse = await firstValueFrom(
            this.http.post(
              `${this.apiService.getBaseUrl()}/Upload?token=${uploadToken}`,
              formData
            )
          );

          if (currentChunk === startChunk || nextOffset === totalBytes) {
            console.log('Upload_File_Chunk response:', {
              fileName: file.name,
              currentChunk,
              offset,
              nextOffset,
              response: chunkResponse,
            });
          }

          uploaded = true;
        } catch (error: any) {
          if (this.isHashMismatchError(error) && attempt < 2) {
            continue;
          }

          throw error;
        }
      }

      offset = nextOffset;
      currentChunk++;

      updateUploadedChunk(
        file.name,
        file.size,
        lastModified,
        fileSystemId,
        folderId,
        currentChunk - 1
      );

      if (onProgress) {
        const percent = (100 * offset) / totalBytes;
        onProgress(percent);
      }
    }

    clearUploadSession(
      file.name,
      file.size,
      lastModified,
      fileSystemId,
      folderId
    );
  }

  private isTokenInvalidError(error: any): boolean {
    if (typeof error?.status === 'number') {
      if (error.status === 401 || error.status === 403) {
        return true;
      }
    }

    const message = this.extractErrorMessage(error);

    if (!message) {
      return false;
    }

    const lower = message.toLowerCase();

    return lower.includes('token') && lower.includes('invalid');
  }

  private isHashMismatchError(error: any): boolean {
    const message = this.extractErrorMessage(error);

    if (!message) {
      return false;
    }

    const lower = message.toLowerCase();

    return lower.includes('hash') && lower.includes('mismatch');
  }

  private extractErrorMessage(error: any): string | null {
    if (!error) {
      return null;
    }

    if (typeof error.message === 'string') {
      return error.message;
    }

    if (typeof error.error === 'string') {
      return error.error;
    }

    if (error.error && typeof error.error.message === 'string') {
      return error.error.message;
    }

    return null;
  }
}

