import { applyDecorators, HttpCode, SetMetadata, type Type } from '@nestjs/common';
{{#if SWAGGER}}
import { ApiBearerAuth, ApiExtraModels, ApiOperation, ApiProperty, ApiPropertyOptional, ApiResponse, getSchemaPath } from '@nestjs/swagger';
{{/if}}
import { RESPONSE_MESSAGE } from '{{IMPORT:nest.decorators}}';

export interface EndpointOptions {
  summary: string;
  /** Success message of the response envelope. */
  message: string;
  status?: number;
  /** Docs: model of `data` (null = empty). */
  response?: Type | null;
  /** Docs: `data` is an array of `response`. */
  array?: boolean;
  /** Docs: `data` is a page (array + meta). */
  paginated?: boolean;
  /** Docs: error statuses this route can answer. */
  errors?: number[];
  /** Docs: needs a bearer token. */
  bearer?: boolean;
}
{{#if SWAGGER}}

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

const ERRORS: Record<number, string> = {
  400: 'Bad request',
  401: 'Missing, invalid or expired access token',
  403: 'Not allowed',
  404: 'Not found',
  409: 'Conflict',
  413: 'Too large',
  422: 'Validation failed (see `errors`)',
  423: 'Account temporarily locked',
  429: 'Too many requests',
  503: 'Service degraded',
};

function docs({ summary, message, status = 200, response = null, array, paginated, errors = [], bearer }: EndpointOptions) {
  const item = response ? { $ref: getSchemaPath(response) } : { type: 'null' };
  const data = array || paginated ? { type: 'array', items: item } : item;
  return [
    ApiOperation({ summary }),
    ApiExtraModels(...(response ? [response] : []), PageMetaDto),
    ApiResponse({
      status,
      description: message,
      schema: {
        type: 'object',
        required: ['success', 'message', 'data'],
        properties: { success: { type: 'boolean', example: true }, message: { type: 'string' }, data, ...(paginated ? { meta: { $ref: getSchemaPath(PageMetaDto) } } : {}) },
      },
    }),
    ...[...errors, 500].map(code => ApiResponse({ status: code, description: ERRORS[code] ?? 'Internal server error', type: ErrorResponseDto })),
    ...(bearer ? [ApiBearerAuth()] : []),
  ];
}
{{/if}}

/**
 * One decorator per route: success message, status{{#if SWAGGER}} and its OpenAPI documentation{{/if}}.
 *
 *   @Endpoint({ summary: 'Log in', message: 'Logged in', response: SessionDto, errors: [401] })
 */
export function Endpoint(options: EndpointOptions) {
  return applyDecorators(
    SetMetadata(RESPONSE_MESSAGE, options.message),
    ...(options.status ? [HttpCode(options.status)] : []),
{{#if SWAGGER}}
    ...docs(options),
{{/if}}
  );
}
