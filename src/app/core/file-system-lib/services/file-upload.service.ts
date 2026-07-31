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

export interface UploadedStorageFileResult {
  fileId: number;
  fileName: string;
  fileType: string;
  fileSize: number;
  folderId: number;
  fileSystemId: number;
}

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
      false,
      false
    );
  }

  async uploadFileWithResult(
    file: File,
    accessToken: string,
    fileSystemId: number,
    folderId: bigint,
    onProgress?: (percent: number) => void
  ): Promise<UploadedStorageFileResult> {
    const fileId = await this.uploadFileInternal(
      file,
      accessToken,
      fileSystemId,
      folderId,
      onProgress,
      false,
      true
    );

    if (!fileId || fileId <= 0) {
      throw {
        message: 'Uploaded file ID was not returned. Please upload again.',
      };
    }

    return {
      fileId,
      fileName: file.name,
      fileType: file.type || '',
      fileSize: file.size,
      folderId: Number(folderId),
      fileSystemId,
    };
  }

  private async uploadFileInternal(
    file: File,
    accessToken: string,
    fileSystemId: number,
    folderId: bigint,
    onProgress: ((percent: number) => void) | undefined,
    hasRetriedForToken: boolean,
    requireFileId: boolean
  ): Promise<number> {
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

      if (requireFileId) {
        throw {
          message: 'Uploaded file ID was not returned. Please upload again.',
        };
      }

      return 0;
    }

    try {
      return await this.uploadFileChunks(
        file,
        uploadToken,
        chunkSize,
        totalBytes,
        fileSystemId,
        folderId,
        lastModified,
        startChunk,
        alreadyUploadedBytes,
        onProgress,
        requireFileId
      );
    } catch (error: any) {
      if (!hasRetriedForToken && this.isTokenInvalidError(error)) {
        clearUploadSession(fileName, fileSize, lastModified, fileSystemId, folderId);

        return await this.uploadFileInternal(
          file,
          accessToken,
          fileSystemId,
          folderId,
          onProgress,
          true,
          requireFileId
        );
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
    onProgress: ((percent: number) => void) | undefined,
    requireFileId: boolean
  ): Promise<number> {
    let offset = alreadyUploadedBytes;
    let currentChunk = startChunk;
    let uploadedFileId = 0;

    while (offset < totalBytes) {
      const nextOffset = Math.min(offset + chunkSize, totalBytes);
      const chunk = file.slice(offset, nextOffset);
      const isLastChunk = nextOffset === totalBytes;

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

          if (currentChunk === startChunk || isLastChunk) {
            console.log('Upload_File_Chunk response:', {
              fileName: file.name,
              currentChunk,
              offset,
              nextOffset,
              response: chunkResponse,
            });
          }

          if (isLastChunk) {
            uploadedFileId = this.parseUploadedFileId(chunkResponse);
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

    if (requireFileId && (!uploadedFileId || uploadedFileId <= 0)) {
      throw {
        message: 'Uploaded file ID was not returned. Please upload again.',
      };
    }

    return uploadedFileId;
  }

  private parseUploadedFileId(response: unknown): number {
    if (response === null || response === undefined) {
      return 0;
    }

    if (typeof response === 'number') {
      return Number.isFinite(response) ? response : 0;
    }

    if (typeof response === 'string') {
      const parsed = Number(response);
      return Number.isFinite(parsed) ? parsed : 0;
    }

    if (typeof response !== 'object') {
      return 0;
    }

    const record = response as Record<string, unknown>;
    const direct =
      record['Uploaded_File_ID'] ??
      record['uploaded_File_ID'] ??
      record['File_ID'] ??
      record['file_ID'];

    if (direct !== undefined && direct !== null && direct !== '') {
      const parsed = Number(direct);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }

    const message = record['message'];
    if (typeof message === 'number') {
      return Number.isFinite(message) ? message : 0;
    }
    if (typeof message === 'string') {
      const parsed = Number(message);
      return Number.isFinite(parsed) ? parsed : 0;
    }
    if (message && typeof message === 'object') {
      const nested = message as Record<string, unknown>;
      const nestedId =
        nested['Uploaded_File_ID'] ?? nested['uploaded_File_ID'] ?? nested['File_ID'];
      if (nestedId !== undefined && nestedId !== null && nestedId !== '') {
        const parsed = Number(nestedId);
        if (Number.isFinite(parsed)) {
          return parsed;
        }
      }
    }

    return 0;
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
