import type { Request, RequestHandler } from 'express';
import multer from 'multer';
import { config } from '{{IMPORT:config.env}}';
import { PayloadTooLargeError, ValidationError } from '{{IMPORT:core.errors}}';
import type { UploadedFile } from '{{IMPORT:port.fileStorage}}';
import { COMMON_MESSAGES } from '{{IMPORT:core.messages}}';

const uploader = multer({ storage: multer.memoryStorage(), limits: { fileSize: config.uploads.maxBytes, files: 1 } });

/**
 * Accepts `multipart/form-data` with one file in `field` (max UPLOAD_MAX_MB):
 *
 *   router.post('/me/avatar', requireAuth, upload('avatar'), controller.setAvatar);
 */
export function upload(field: string): RequestHandler {
  const single = uploader.single(field);
  return (req, res, next) =>
    single(req, res, error => {
      if (error instanceof multer.MulterError) {
        return next(error.code === 'LIMIT_FILE_SIZE' ? new PayloadTooLargeError(COMMON_MESSAGES.fileTooLarge(config.uploads.maxBytes / 1024 / 1024)) : new ValidationError([{ field, message: error.message }]));
      }
      next(error);
    });
}

/** The file received by `upload(field)` (422 when none was sent). */
export function uploadedFile(req: Request, field: string): UploadedFile {
  const file = req.file;
  if (!file) throw new ValidationError([{ field, message: COMMON_MESSAGES.fileRequired }]);
  return { buffer: file.buffer, originalName: file.originalname, mimeType: file.mimetype, size: file.size };
}
