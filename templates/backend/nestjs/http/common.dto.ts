import { Transform, Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '{{IMPORT:core.pagination}}';

/** Trims string input (use with @Transform). */
export const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

/** `?page=1&limit=20` */
export class PageQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_SIZE)
  limit: number = DEFAULT_PAGE_SIZE;
}

/** `?page=1&limit=20&search=jane` */
export class SearchPageQueryDto extends PageQueryDto {
  /** Searches email and name. */
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  search?: string;
}
