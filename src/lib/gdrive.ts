/**
 * Google Drive URL Parser & Utilities for NotesGO
 */

/**
 * Extracts the Google Drive File ID from any share link, embed link, or raw ID.
 */
export function extractGoogleDriveFileId(input: string): string | null {
  if (!input) return null;
  const trimmed = input.trim();

  // Pattern 1: https://drive.google.com/file/d/1A2b3C.../view
  const fileDMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileDMatch && fileDMatch[1]) return fileDMatch[1];

  // Pattern 2: https://drive.google.com/open?id=1A2b3C...
  const idParamMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idParamMatch && idParamMatch[1]) return idParamMatch[1];

  // Pattern 3: https://docs.google.com/document/d/1A2b3C.../edit
  const docDMatch = trimmed.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (docDMatch && docDMatch[1]) return docDMatch[1];

  // Pattern 4: Raw file ID (usually 25-60 characters)
  if (/^[a-zA-Z0-9_-]{25,65}$/.test(trimmed)) {
    return trimmed;
  }

  return null;
}

/**
 * Checks if a file's storage_path represents a Google Drive hosted file.
 */
export function isGoogleDrivePath(storagePath: string | undefined | null): boolean {
  if (!storagePath) return false;
  return (
    storagePath.startsWith('gdrive:') ||
    storagePath.includes('drive.google.com') ||
    storagePath.includes('docs.google.com')
  );
}

/**
 * Gets the clean Google Drive file ID from a storage_path.
 */
export function getGoogleDriveId(storagePath: string | undefined | null): string | null {
  if (!storagePath) return null;
  if (storagePath.startsWith('gdrive:')) {
    return storagePath.replace('gdrive:', '').trim();
  }
  return extractGoogleDriveFileId(storagePath);
}

/**
 * Generates the native full-screen embed URL for high-speed streaming without CORS issues.
 */
export function getGoogleDrivePreviewUrl(storagePath: string | undefined | null): string {
  const fileId = getGoogleDriveId(storagePath);
  if (fileId) {
    return `https://drive.google.com/file/d/${fileId}/preview`;
  }
  return storagePath || '';
}

/**
 * Generates direct download URL.
 */
export function getGoogleDriveDownloadUrl(storagePath: string | undefined | null): string {
  const fileId = getGoogleDriveId(storagePath);
  if (fileId) {
    return `https://drive.google.com/uc?export=download&id=${fileId}`;
  }
  return storagePath || '';
}

/**
 * Generates open in Google Drive direct URL.
 */
export function getGoogleDriveViewUrl(storagePath: string | undefined | null): string {
  const fileId = getGoogleDriveId(storagePath);
  if (fileId) {
    return `https://drive.google.com/file/d/${fileId}/view`;
  }
  return storagePath || '';
}
