/**
 * Folder name validator: only letters, numbers, spaces, and underscore (_) are allowed.
 * No other special characters.
 */
const FOLDER_NAME_PATTERN = /^[\p{L}\p{N}\s_]+$/u;

export function isFolderNameValid(name: string): boolean {
  if (name == null) return false;
  const trimmed = name.trim();
  if (trimmed.length === 0) return false;
  return FOLDER_NAME_PATTERN.test(trimmed);
}

export const FOLDER_NAME_INVALID_MESSAGE_KEY = 'fileSystem.folderManagement.folderNameInvalidFormat';
