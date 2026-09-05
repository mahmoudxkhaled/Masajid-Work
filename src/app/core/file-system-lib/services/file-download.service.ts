import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { ApiService } from '../../api/api.service';

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

    console.log('Download_Request response', response);

    if (!response?.success || !response?.message) {
      throw {
        errorCode: typeof response?.message === 'string' ? response.message : undefined,
        message: response?.message || 'Download request failed.',
      };
    }

    if (typeof response.message === 'string') {
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
  ): Promise<ArrayBuffer[]> {
    const allChunks: ArrayBuffer[] = [];

    console.log('Download_File_Chunk using key', {
      downloadToken,
      chunksCount,
    });

    for (let chunkId = 1; chunkId <= chunksCount; chunkId++) {
      const formData = new FormData();
      formData.append('download_token', downloadToken);
      formData.append('chunk_id', chunkId.toString());

      const arrayBuffer = (await firstValueFrom(
        this.http.post(
          `${this.apiService.getBaseUrl()}/Download`,
          formData,
          { responseType: 'arraybuffer' }
        )
      )) as ArrayBuffer;

      this.throwIfChunkIsJson(arrayBuffer);

      allChunks.push(arrayBuffer);

      if (chunkId === 1 || chunkId === chunksCount) {
        console.log('Download_File_Chunk received:', {
          currentChunk: chunkId,
          chunksCount,
          bytes: arrayBuffer.byteLength,
        });
      }

      if (onProgress) {
        onProgress((100 * chunkId) / chunksCount);
      }
    }

    return allChunks;
  }

  private throwIfChunkIsJson(arrayBuffer: ArrayBuffer): void {
    if (!arrayBuffer || arrayBuffer.byteLength < 2) {
      throw {
        message: 'Download chunk was empty.',
      };
    }

    const firstByte = new Uint8Array(arrayBuffer, 0, 1)[0];
    if (firstByte !== 0x7b) {
      return;
    }

    const text = new TextDecoder().decode(arrayBuffer);
    let parsed: { success?: boolean; message?: string };
    try {
      parsed = JSON.parse(text);
    } catch {
      return;
    }

    console.log('Download_File_Chunk JSON response', parsed);

    if (parsed && typeof parsed === 'object' && ('success' in parsed || 'message' in parsed)) {
      throw {
        errorCode: typeof parsed?.message === 'string' ? parsed.message : undefined,
        message: parsed?.message || 'Download chunk was not a file stream.',
      };
    }
  }
}
