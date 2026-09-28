export interface UploadedFile {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
  size: number;
}

export interface StoredFile {
  /** Public URL of the file. */
  url: string;
  /** Storage key, needed to delete the file. */
  key: string;
  fileName: string;
  mimeType: string;
  size: number;
}

/** Where uploaded files go (local disk by default; swap for S3 / GCS / Cloudinary). */
export interface FileStorage {
  save(file: UploadedFile, folder: string): Promise<StoredFile>;
  /** Accepts a key or a URL returned by `save`; unknown files are ignored. */
  delete(keyOrUrl: string): Promise<void>;
}
