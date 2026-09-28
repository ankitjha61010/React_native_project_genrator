import { ValidationPipe, type ArgumentMetadata, type ValidationError as ClassValidatorError } from '@nestjs/common';
import { ValidationError, type FieldError } from '{{IMPORT:core.errors}}';

/**
 * When several rules fail for one field, report the most fundamental one ("is required"
 * before "is too long"), whatever order the decorators were declared in.
 */
const PRIORITY = ['whitelistValidation', 'isDefined', 'isNotEmpty', 'isString', 'isEmail', 'isInt', 'isBoolean', 'isIn', 'min', 'minLength', 'max', 'maxLength', 'matches'];

function mainMessage(constraints: Record<string, string>): string | undefined {
  const key = PRIORITY.find(name => name in constraints) ?? Object.keys(constraints)[0];
  return key ? constraints[key] : undefined;
}

function flatten(errors: ClassValidatorError[], parent = ''): FieldError[] {
  return errors.flatMap(error => {
    const field = parent ? `${parent}.${error.property}` : error.property;
    const message = mainMessage(error.constraints ?? {});
    return [...(message ? [{ field, message }] : []), ...flatten(error.children ?? [], field)];
  });
}

/**
 * DTO validation for every body, query and route parameter. Unknown fields are rejected,
 * values are transformed to the DTO types, and failures become the standard 422 error
 * (`field` is `email`, `query.limit`, `params.id`…).
 */
export class AppValidationPipe extends ValidationPipe {
  constructor() {
    super({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      stopAtFirstError: false,
      exceptionFactory: errors => new ValidationError(flatten(errors)),
    });
  }

  override async transform(value: unknown, metadata: ArgumentMetadata): Promise<unknown> {
    try {
      return await super.transform(value, metadata);
    } catch (error) {
      if (error instanceof ValidationError && metadata.type !== 'body') {
        const prefix = metadata.type === 'param' ? 'params' : metadata.type;
        throw new ValidationError(error.errors.map(e => ({ ...e, field: `${prefix}.${e.field}` })));
      }
      throw error;
    }
  }
}
