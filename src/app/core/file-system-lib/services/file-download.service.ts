import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { ApiService } from '../../api/api.service';

/** Request code for Download_Request (Files Basic). */
const DOWNLOAD_REQUEST_CODE = 1111;

@Injectable({
  providedIn: 'root',
})
export class FileDownloadService {
  private readonly apiService = inject(ApiService);
  private readonly http = inject(HttpClient);

  async downloadFile(
    accessToken: string,
    fileId: bigint,
    folderId: bigint,
    fileSystemId: number,
    onProgress?: (percent: number) => void
  ): Promise<Blob> {
    const downloadInfo = await this.requestDownloadToken(
      accessToken,
      fileId,
      folderId,
      fileSystemId
    );

    const chunks = await this.downloadChunks(
      downloadInfo.downloadToken,
      downloadInfo.chunksCount,
      onProgress
    );

    return new Blob(chunks, { type: 'application/octet-stream' });
  }

  private async requestDownloadToken(
    accessToken: string,
    fileId: bigint,
    folderId: bigint,
    fileSystemId: number
  ): Promise<{
    downloadToken: string;
    fileName: string;
    chunksCount: number;
  }> {
    const parameters: string[] = [
      fileId.toString(),
      folderId.toString(),
      fileSystemId.toString(),
    ];

    const response = (await firstValueFrom(
      this.apiService.callAPI(DOWNLOAD_REQUEST_CODE, accessToken, parameters)
    )) as unknown as {
      success: boolean;
      message:
      | string
      | {
        download_Token: string;
        file_Name: string;
        chunks_Count: number;
      };
    };

    console.log('Download_Request response:', response);

    // If API failed (e.g. { success: false, message: "ERP12241" }), throw a response-like
    // object so callers (folder-management component) can use getFileSystemErrorDetail
    // with the Storage/File System API error codes.
    if (!response?.success || !response?.message) {
      throw {
        errorCode: typeof response?.message === 'string' ? response.message : undefined,
        message: response?.message || 'Download request failed.',
      };
    }

    if (typeof response.message === 'string') {
      // Unexpected payload shape – propagate as error for generic handling.
      throw {
        message: response.message,
      };
    }

    const { download_Token, file_Name, chunks_Count } = response.message;

    if (!download_Token || !file_Name || !chunks_Count) {
      throw {
        message: 'Download request returned invalid data.',
      };
    }

    return {
      downloadToken: download_Token,
      fileName: file_Name,
      chunksCount: chunks_Count,
    };
  }

  private async downloadChunks(
    downloadToken: string,
    chunksCount: number,
    onProgress?: (percent: number) => void
  ): Promise<BlobPart[]> {
    const allChunks: BlobPart[] = [];

    for (let currentChunk = 1; currentChunk <= chunksCount; currentChunk++) {
      const formData = new FormData();
      formData.append('Chunk_ID', currentChunk.toString());

      const arrayBuffer = await firstValueFrom(
        this.http.post(
          `${this.apiService.getBaseUrl()}/Download?Download_Token=${encodeURIComponent(downloadToken)}`,
          formData,
          { responseType: 'arraybuffer' as 'json' }
        )
      );

      allChunks.push(arrayBuffer as ArrayBuffer);

      if (currentChunk === 1 || currentChunk === chunksCount) {
        console.log('Download_File_Chunk received:', {
          currentChunk,
          chunksCount,
          bytes: (arrayBuffer as ArrayBuffer).byteLength,
        });
      }

      if (onProgress) {
        const percent = (100 * currentChunk) / chunksCount;
        onProgress(percent);
      }
    }

    return allChunks;
  }
}

