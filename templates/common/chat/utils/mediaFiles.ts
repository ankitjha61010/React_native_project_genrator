import { Dirs, FileSystem } from 'react-native-file-access';
import { viewDocument } from '@react-native-documents/viewer';

/** Downloaded chat documents live here (the OS may clear it when space runs low). */
const DOCS_DIR = `${Dirs.CacheDir}/chat-documents`;

const MIME_TYPES: Record<string, string> = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  txt: 'text/plain',
  csv: 'text/csv',
  rtf: 'application/rtf',
  zip: 'application/zip',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
};

/** "report.final.PDF?token=…" → "pdf". */
export function fileExtension(nameOrUrl?: string): string {
  if (!nameOrUrl) return '';
  const clean = nameOrUrl.split(/[?#]/)[0] ?? '';
  const dot = clean.lastIndexOf('.');
  return dot >= 0 ? clean.slice(dot + 1).toLowerCase() : '';
}

export function mimeTypeFor(fileName?: string, uri?: string): string | undefined {
  return MIME_TYPES[fileExtension(fileName) || fileExtension(uri)];
}

export function isPdf(fileName?: string, uri?: string): boolean {
  return (fileExtension(fileName) || fileExtension(uri)) === 'pdf';
}

export function toFileUri(path: string): string {
  return /^[a-z]+:\/\//i.test(path) ? path : `file://${path}`;
}

/** Small stable hash, so the same URL is downloaded once. */
function hash(value: string): string {
  let h = 5381;
  for (let i = 0; i < value.length; i++) h = ((h << 5) + h + value.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

/**
 * A local copy of a chat file: remote URLs are downloaded into the cache once,
 * local files (just sent from this device) are used as they are.
 */
export async function localCopy(uri: string, fileName?: string): Promise<string> {
  if (!/^https?:\/\//i.test(uri)) return uri.replace(/^file:\/\//, '');
  const ext = fileExtension(fileName) || fileExtension(uri);
  const safeName = (fileName ?? 'document').replace(/[^\w.-]+/g, '_').slice(-60);
  const path = `${DOCS_DIR}/${hash(uri)}-${safeName}${ext && !safeName.toLowerCase().endsWith(`.${ext}`) ? `.${ext}` : ''}`;
  if (await FileSystem.exists(path)) return path;
  if (!(await FileSystem.exists(DOCS_DIR))) await FileSystem.mkdir(DOCS_DIR);
  const result = await FileSystem.fetch(uri, { path });
  if (!result.ok) {
    await FileSystem.unlink(path).catch(() => undefined);
    throw new Error(`Download failed (${result.status})`);
  }
  return path;
}

/**
 * Opens a document in the system viewer – QuickLook on iOS (in the app, zoomable),
 * the installed viewer app on Android (Word, Sheets, Drive…). No web view.
 */
export async function openInSystemViewer(uri: string, fileName?: string): Promise<void> {
  const path = await localCopy(uri, fileName);
  await viewDocument({
    uri: toFileUri(path),
    mimeType: mimeTypeFor(fileName, uri),
    headerTitle: fileName,
    grantPermissions: 'read',
    presentationStyle: 'fullScreen',
  });
}
