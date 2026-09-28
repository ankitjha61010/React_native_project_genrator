import { applyDecorators, type Type } from '@nestjs/common';
import { ApiExtraModels, ApiProperty, ApiPropertyOptional, ApiResponse, getSchemaPath } from '@nestjs/swagger';

export class FieldErrorDto {
  @ApiPropertyOptional({ example: 'email' })
  field?: string;

  @ApiProperty({ example: 'email must be an email' })
  message: string;
}

export class ErrorResponseDto {
  @ApiProperty({ example: false })
  success: false;

  @ApiProperty({ example: 'Validation failed' })
  message: string;

  @ApiProperty({ example: 'VALIDATION_ERROR', description: 'Stable, machine readable code' })
  code: string;

  @ApiProperty({ type: [FieldErrorDto] })
  errors: FieldErrorDto[];
}

export class PageMetaDto {
  @ApiProperty() page: number;
  @ApiProperty() limit: number;
  @ApiProperty() total: number;
  @ApiProperty() totalPages: number;
  @ApiProperty() hasNextPage: boolean;
  @ApiProperty() hasPreviousPage: boolean;
}

interface EnvelopeOptions {
  status?: number;
  description?: string;
  isArray?: boolean;
  paginated?: boolean;
}

/** Documents `{ success, message, data: <model>, meta? }` (model = null for empty responses). */
export function ApiEnvelope(model: Type | null, { status = 200, description = 'OK', isArray = false, paginated = false }: EnvelopeOptions = {}) {
  const item = model ? { $ref: getSchemaPath(model) } : { type: 'null' };
  const data = isArray || paginated ? { type: 'array', items: item } : item;
  return applyDecorators(
    ApiExtraModels(...(model ? [model] : []), PageMetaDto),
    ApiResponse({
      status,
      description,
      schema: {
        type: 'object',
        required: ['success', 'message', 'data'],
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string' },
          data,
          ...(paginated ? { meta: { $ref: getSchemaPath(PageMetaDto) } } : {}),
        },
      },
    }),
  );
}

const DESCRIPTIONS: Record<number, string> = {
  400: 'Bad request',
  401: 'Missing, invalid or expired access token',
  403: 'Not allowed',
  404: 'Not found',
  409: 'Conflict',
  422: 'Validation failed (see `errors`)',
  423: 'Account temporarily locked',
  429: 'Too many requests',
};

/** Documents error responses (always including 500). */
export function ApiErrors(...statuses: number[]) {
  return applyDecorators(
    ...[...statuses, 500].map(status => ApiResponse({ status, description: DESCRIPTIONS[status] ?? 'Internal server error', type: ErrorResponseDto })),
  );
}
