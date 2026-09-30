import { Transform } from 'class-transformer';
import { {{#if AUTH}}IsBoolean, IsEnum, {{else}}IsEmail, {{/if}}IsNotEmpty, IsOptional, IsString{{#if AUTH}}, Matches{{/if}}, MaxLength } from 'class-validator';
{{#if AUTH}}
import { UserRole } from '{{IMPORT:domain.roles}}';
{{/if}}
import { trim } from '{{IMPORT:nest.commonDto}}';
{{#if NO_AUTH}}

export class CreateUserDto {
  /** @example jane@example.com */
  @IsEmail()
  @MaxLength(255)
  email: string;

  /** @example Jane Doe */
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;
}
{{/if}}

export class UpdateUserDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name?: string;
{{#if AUTH}}

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
{{/if}}
}
{{#if AUTH}}

/** The app's Edit Profile screen. Send `phone: null` to remove the number. */
export class UpdateProfileDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name?: string;

  /** @example +91 */
  @IsOptional()
  @Matches(/^\+?\d{1,4}$/, { message: 'countryCode must be a dial code like +91' })
  countryCode?: string | null;

  /** @example 9876543210 */
  @IsOptional()
  @Matches(/^[\d\s-]{4,20}$/, { message: 'phone must be a valid mobile number' })
  phone?: string | null;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(120)
  location?: string | null;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(500)
  bio?: string | null;
}
{{/if}}

// ── responses (documentation) ────────────────────────────────────────────────

export class UserResponseDto {
  id: string;
{{#if AUTH}}
  email: string | null;
  name: string;
  avatar: string | null;
  countryCode: string | null;
  phone: string | null;
  location: string | null;
  bio: string | null;
  role: UserRole;
  emailVerified: boolean;
  phoneVerified: boolean;
  hasPassword: boolean;
{{else}}
  email: string;
  name: string;
{{/if}}
  createdAt: string;
  updatedAt: string;
}
{{#if AUTH}}

export class UserSummaryDto {
  id: string;
  name: string;
  avatar: string | null;
}
{{/if}}
