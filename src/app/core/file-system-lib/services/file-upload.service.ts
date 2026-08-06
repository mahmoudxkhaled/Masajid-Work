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

/** Backend requires chunk size > 0 and < 250 KB. */
const UPLOAD_CHUNK_SIZE_BYTES = 240 * 1024;

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
    const chunkSize = UPLOAD_CHUNK_SIZE_BYTES;
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
        accessToken,
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

    console.log('Upload_Request parameters:', parameters);
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
    accessToken: string,
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
          const httpResponse = await firstValueFrom(
            this.http.post(
              `${this.apiService.getBaseUrl()}/Upload?token=${uploadToken}`,
              formData,
              { responseType: 'text', observe: 'response' }
            )
          );

          const chunkResponse = this.parseChunkResponseBody(httpResponse.body);

          if (currentChunk === startChunk || isLastChunk) {
            console.log('Upload_File_Chunk response:', {
              fileName: file.name,
              currentChunk,
              offset,
              nextOffset,
              status: httpResponse.status,
              rawBody: httpResponse.body,
              response: chunkResponse,
            });
          }

          if (isLastChunk) {
            uploadedFileId = this.parseUploadedFileId(chunkResponse);
            if ((!uploadedFileId || uploadedFileId <= 0) && httpResponse.body) {
              uploadedFileId = this.parseUploadedFileId(httpResponse.body);
            }
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
      uploadedFileId = await this.resolveUploadedFileIdFromFolder(
        accessToken,
        fileSystemId,
        folderId,
        file.name
      );
      console.log('Upload file ID resolved from folder contents:', {
        fileName: file.name,
        fileId: uploadedFileId,
      });
    }

    if (requireFileId && (!uploadedFileId || uploadedFileId <= 0)) {
      throw {
        message: 'Uploaded file ID was not returned. Please upload again.',
      };
    }

    return uploadedFileId;
  }

  private parseChunkResponseBody(raw: string | null): unknown {
    if (raw == null) {
      return null;
    }

    const trimmed = String(raw).trim();
    if (!trimmed) {
      return null;
    }

    try {
      return JSON.parse(trimmed);
    } catch {
      return trimmed;
    }
  }

  private parseUploadedFileId(response: unknown): number {
    if (response === null || response === undefined) {
      return 0;
    }

    if (typeof response === 'number') {
      return Number.isFinite(response) && response > 0 ? response : 0;
    }

    if (typeof response === 'bigint') {
      const parsed = Number(response);
      return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
    }

    if (typeof response === 'string') {
      const trimmed = response.trim();
      if (!trimmed) {
        return 0;
      }

      if (
        (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
        (trimmed.startsWith('[') && trimmed.endsWith(']')) ||
        (trimmed.startsWith('"') && trimmed.endsWith('"'))
      ) {
        try {
          return this.parseUploadedFileId(JSON.parse(trimmed));
        } catch {
          // fall through to numeric parse
        }
      }

      const parsed = Number(trimmed);
      return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
    }

    if (typeof response !== 'object') {
      return 0;
    }

    const record = response as Record<string, unknown>;
    const candidates = [
      record['Uploaded_File_ID'],
      record['uploaded_File_ID'],
      record['uploaded_file_id'],
      record['File_ID'],
      record['file_ID'],
      record['file_id'],
      record['fileId'],
      record['Body'],
      record['body'],
      record['data'],
      record['result'],
      record['Result'],
    ];

    for (const candidate of candidates) {
      const parsed = this.parseUploadedFileId(candidate);
      if (parsed > 0) {
        return parsed;
      }
    }

    const message = record['message'];
    if (message !== undefined && message !== null && message !== '') {
      const parsed = this.parseUploadedFileId(message);
      if (parsed > 0) {
        return parsed;
      }
    }

    if (record['success'] === true && message !== undefined && message !== null) {
      const parsed = this.parseUploadedFileId(message);
      if (parsed > 0) {
        return parsed;
      }
    }

    return 0;
  }

  private async resolveUploadedFileIdFromFolder(
    accessToken: string,
    fileSystemId: number,
    folderId: bigint,
    fileName: string
  ): Promise<number> {
    try {
      const response: any = await firstValueFrom(
        this.apiService.callAPI(1136, accessToken, [
          folderId.toString(),
          fileSystemId.toString(),
        ])
      );

      console.log('Get_Folder_Contents response (upload ID fallback)', response);

      if (!response?.success) {
        return 0;
      }

      const raw = response.message;
      const filesList = raw?.files ?? raw?.Files ?? [];
      const targetName = String(fileName || '').trim().toLowerCase();

      for (const file of filesList) {
        const name = String(
          file?.file_name ?? file?.file_Name ?? file?.File_Name ?? file?.name ?? ''
        )
          .trim()
          .toLowerCase();
        if (!name || name !== targetName) {
          continue;
        }

        const fileId = Number(
          file?.file_id ?? file?.file_ID ?? file?.File_ID ?? file?.id ?? 0
        );
        if (Number.isFinite(fileId) && fileId > 0) {
          return fileId;
        }
      }
    } catch (error) {
      console.error('Failed to resolve uploaded file ID from folder contents', error);
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
