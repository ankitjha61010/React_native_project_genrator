/// <reference types="multer" />
import { applyDecorators, createParamDecorator, UseInterceptors, type ExecutionContext } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
{{#if SWAGGER}}
import { ApiBody, ApiConsumes } from '@nestjs/swagger';
{{/if}}
import type { Request } from 'express';
import { config } from '{{IMPORT:config.env}}';
import { ValidationError } from '{{IMPORT:core.errors}}';
import type { UploadedFile } from '{{IMPORT:port.fileStorage}}';
import { COMMON_MESSAGES } from '{{IMPORT:core.messages}}';

/** multipart/form-data with one file in `field` (size limit UPLOAD_MAX_MB). */
export const Upload = (field: string) =>
  applyDecorators(
    UseInterceptors(FileInterceptor(field, { limits: { fileSize: config.uploads.maxBytes, files: 1 } })),
{{#if SWAGGER}}
    ApiConsumes('multipart/form-data'),
    ApiBody({ schema: { type: 'object', required: [field], properties: { [field]: { type: 'string', format: 'binary' } } } }),
{{/if}}
  );

/** The uploaded file as the application's `UploadedFile` (422 when missing). */
export const UploadedFileOf = createParamDecorator((field: string, context: ExecutionContext): UploadedFile => {
  const file = context.switchToHttp().getRequest<Request>().file;
  if (!file) throw new ValidationError([{ field, message: COMMON_MESSAGES.fileRequired }]);
  return { buffer: file.buffer, originalName: file.originalname, mimeType: file.mimetype, size: file.size };
});
