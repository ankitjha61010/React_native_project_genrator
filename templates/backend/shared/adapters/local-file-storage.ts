import { randomUUID } from 'node:crypto';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { FileStorage, StoredFile, UploadedFile } from '{{IMPORT:port.fileStorage}}';

/**
 * Stores uploads on the server's disk and serves them under `/uploads` (see the app setup).
 * Fine for one server; use object storage (S3, GCS…) when running several instances.
 */
export class LocalFileStorage implements FileStorage {
  private readonly root: string;

  constructor(
    dir: string,
    /** e.g. http://localhost:3000/uploads */
    private readonly baseUrl: string,
  ) {
    this.root = path.resolve(dir);
  }

  async save(file: UploadedFile, folder: string): Promise<StoredFile> {
    // Never use the client's file name on disk – only a safe extension.
    let ext = path.extname(file.originalName).toLowerCase().replace(/[^.a-z0-9]/g, '').slice(0, 10);
    if (!ext || ext === '.') {
      const mimeMap: Record<string, string> = {
        'video/mp4': '.mp4',
        'video/quicktime': '.mov',
        'video/webm': '.webm',
        'video/3gpp': '.3gp',
        'image/jpeg': '.jpg',
        'image/png': '.png',
        'image/gif': '.gif',
        'image/webp': '.webp',
        'image/heic': '.heic',
        'audio/mp4': '.m4a',
        'audio/mpeg': '.mp3',
        'audio/aac': '.aac',
        'audio/wav': '.wav',
        'audio/ogg': '.ogg',
        'application/pdf': '.pdf',
      };
      ext = mimeMap[file.mimeType] || (file.mimeType?.startsWith('video/') ? '.mp4' : file.mimeType?.startsWith('image/') ? '.jpg' : file.mimeType?.startsWith('audio/') ? '.mp3' : '');
    }
    const key = `${folder}/${new Date().toISOString().slice(0, 7)}/${randomUUID()}${ext}`;
    const target = this.resolve(key);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, file.buffer);
    return { url: `${this.baseUrl}/${key}`, key, fileName: file.originalName, mimeType: file.mimeType, size: file.size };
  }

  async delete(keyOrUrl: string): Promise<void> {
    const key = keyOrUrl.startsWith(this.baseUrl) ? keyOrUrl.slice(this.baseUrl.length + 1) : keyOrUrl;
    if (/^https?:/.test(key)) return; // someone else's URL (e.g. a Google avatar)
    await rm(this.resolve(key), { force: true });
  }

  /** Keeps every path inside the upload directory. */
  private resolve(key: string): string {
    const target = path.resolve(this.root, key);
    if (!target.startsWith(this.root + path.sep)) throw new Error('Invalid storage key');
    return target;
  }
}
