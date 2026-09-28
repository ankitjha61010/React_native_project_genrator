{{#if SWAGGER}}
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
{{/if}}
import { Transform, Type } from 'class-transformer';
{{#if AUTH}}
import { IsBoolean, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
{{else}}
import { IsEmail, IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
{{/if}}
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '{{IMPORT:core.pagination}}';
{{#if AUTH}}
import { ROLES, type Role } from '{{IMPORT:domain.roles}}';
{{/if}}

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class ListUsersQueryDto {
{{#if SWAGGER}}
  @ApiPropertyOptional({ default: 1, minimum: 1 })
{{/if}}
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

{{#if SWAGGER}}
  @ApiPropertyOptional({ default: DEFAULT_PAGE_SIZE, minimum: 1, maximum: MAX_PAGE_SIZE })
{{/if}}
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_SIZE)
  limit: number = DEFAULT_PAGE_SIZE;

{{#if SWAGGER}}
  @ApiPropertyOptional({ description: 'Searches email and name' })
{{/if}}
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  search?: string;
}
{{#if NO_AUTH}}

export class CreateUserDto {
{{#if SWAGGER}}
  @ApiProperty({ example: 'jane@example.com' })
{{/if}}
  @IsEmail()
  @MaxLength(255)
  email: string;

{{#if SWAGGER}}
  @ApiProperty({ example: 'Jane Doe' })
{{/if}}
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;
}
{{/if}}

export class UpdateUserDto {
{{#if SWAGGER}}
  @ApiPropertyOptional({ example: 'Jane Doe' })
{{/if}}
  @IsOptional()
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name?: string;
{{#if AUTH}}

{{#if SWAGGER}}
  @ApiPropertyOptional({ enum: ROLES })
{{/if}}
  @IsOptional()
  @IsIn(ROLES)
  role?: Role;

{{#if SWAGGER}}
  @ApiPropertyOptional()
{{/if}}
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
{{/if}}
}
{{#if AUTH}}

export class UpdateProfileDto {
{{#if SWAGGER}}
  @ApiProperty({ example: 'Jane Doe' })
{{/if}}
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;
}
{{/if}}
{{#if SWAGGER}}

// ── responses (documentation) ────────────────────────────────────────────────

export class UserResponseDto {
  @ApiProperty() id: string;
  @ApiProperty({ example: 'jane@example.com' }) email: string;
  @ApiProperty({ example: 'Jane Doe' }) name: string;
{{#if AUTH}}
  @ApiProperty({ enum: ROLES }) role: Role;
  @ApiProperty() emailVerified: boolean;
{{/if}}
  @ApiProperty({ format: 'date-time' }) createdAt: string;
  @ApiProperty({ format: 'date-time' }) updatedAt: string;
}
{{/if}}
