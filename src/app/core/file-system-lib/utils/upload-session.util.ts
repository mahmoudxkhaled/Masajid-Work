export interface UploadSession {
  fileName: string;
  fileSize: number;
  lastModified: number;
  fileSystemId: number;
  folderId: string;
  uploadToken: string;
  chunkSize: number;
  totalChunks: number;
  lastUploadedChunkIndex: number;
}

function getStorage(): Storage | null {
  if (typeof window === 'undefined' || !window.localStorage) {
    return null;
  }

  return window.localStorage;
}

function buildUploadSessionKey(
  fileName: string,
  fileSize: number,
  lastModified: number,
  fileSystemId: number,
  folderId: bigint
): string {
  const safeFileName = encodeURIComponent(fileName);
  const folderIdString = folderId.toString();

  return `upload_session_${safeFileName}_${fileSize}_${lastModified}_${fileSystemId}_${folderIdString}`;
}

export function getUploadSession(
  fileName: string,
  fileSize: number,
  lastModified: number,
  fileSystemId: number,
  folderId: bigint
): UploadSession | null {
  const storage = getStorage();

  if (!storage) {
    return null;
  }

  const key = buildUploadSessionKey(
    fileName,
    fileSize,
    lastModified,
    fileSystemId,
    folderId
  );

  const raw = storage.getItem(key);

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as UploadSession;
    return parsed;
  } catch {
    storage.removeItem(key);
    return null;
  }
}

export function saveUploadSession(session: UploadSession): void {
  const storage = getStorage();

  if (!storage) {
    return;
  }

  const folderIdBigInt = BigInt(session.folderId);

  const key = buildUploadSessionKey(
    session.fileName,
    session.fileSize,
    session.lastModified,
    session.fileSystemId,
    folderIdBigInt
  );

  storage.setItem(key, JSON.stringify(session));
}

export function updateUploadedChunk(
  fileName: string,
  fileSize: number,
  lastModified: number,
  fileSystemId: number,
  folderId: bigint,
  lastUploadedChunkIndex: number
): void {
  const storage = getStorage();

  if (!storage) {
    return;
  }

  const key = buildUploadSessionKey(
    fileName,
    fileSize,
    lastModified,
    fileSystemId,
    folderId
  );

  const raw = storage.getItem(key);

  if (!raw) {
    return;
  }

  try {
    const session = JSON.parse(raw) as UploadSession;
    session.lastUploadedChunkIndex = lastUploadedChunkIndex;
    storage.setItem(key, JSON.stringify(session));
  } catch {
    storage.removeItem(key);
  }
}

export function clearUploadSession(
  fileName: string,
  fileSize: number,
  lastModified: number,
  fileSystemId: number,
  folderId: bigint
): void {
  const storage = getStorage();

  if (!storage) {
    return;
  }

  const key = buildUploadSessionKey(
    fileName,
    fileSize,
    lastModified,
    fileSystemId,
    folderId
  );

  storage.removeItem(key);
}

