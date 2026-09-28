{{#if SWAGGER}}
import { ApiProperty } from '@nestjs/swagger';
{{/if}}
import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { config } from '{{IMPORT:config.env}}';
{{#if SWAGGER}}
import { UserResponseDto } from '{{IMPORT:nest.users.dto}}';
{{/if}}

const { minLength, maxLength } = config.password;

/** New passwords – mirrors assertPasswordPolicy (application layer). */
function NewPassword() {
  return (target: object, key: string) => {
    IsString()(target, key);
    MinLength(minLength, { message: `$property must be at least ${minLength} characters` })(target, key);
    MaxLength(maxLength)(target, key);
    Matches(/[a-z]/i, { message: '$property must contain a letter' })(target, key);
    Matches(/\d/, { message: '$property must contain a number' })(target, key);
  };
}

export class RegisterDto {
{{#if SWAGGER}}
  @ApiProperty({ example: 'jane@example.com' })
{{/if}}
  @IsEmail()
  @MaxLength(255)
  email: string;

{{#if SWAGGER}}
  @ApiProperty({ example: 'Sup3rSecret', minLength, maxLength, description: 'Letters and numbers' })
{{/if}}
  @NewPassword()
  password: string;

{{#if SWAGGER}}
  @ApiProperty({ example: 'Jane Doe', maxLength: 120 })
{{/if}}
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;
}

export class LoginDto {
{{#if SWAGGER}}
  @ApiProperty({ example: 'jane@example.com' })
{{/if}}
  @IsEmail()
  @MaxLength(255)
  email: string;

{{#if SWAGGER}}
  @ApiProperty({ example: 'Sup3rSecret' })
{{/if}}
  @IsString()
  @IsNotEmpty()
  @MaxLength(maxLength)
  password: string;
}
{{#if AUTH_REFRESH}}

export class RefreshTokenDto {
{{#if SWAGGER}}
  @ApiProperty()
{{/if}}
  @IsString()
  @IsNotEmpty()
  @MaxLength(2048)
  refreshToken: string;
}
{{/if}}

export class ChangePasswordDto {
{{#if SWAGGER}}
  @ApiProperty()
{{/if}}
  @IsString()
  @IsNotEmpty()
  @MaxLength(maxLength)
  currentPassword: string;

{{#if SWAGGER}}
  @ApiProperty({ example: 'An0therSecret', minLength, maxLength })
{{/if}}
  @NewPassword()
  newPassword: string;
}

export class ForgotPasswordDto {
{{#if SWAGGER}}
  @ApiProperty({ example: 'jane@example.com' })
{{/if}}
  @IsEmail()
  @MaxLength(255)
  email: string;
}

export class ResetPasswordDto {
{{#if SWAGGER}}
  @ApiProperty({ description: 'Token from the reset email' })
{{/if}}
  @IsString()
  @IsNotEmpty()
  @MaxLength(512)
  token: string;

{{#if SWAGGER}}
  @ApiProperty({ example: 'Brand5New', minLength, maxLength })
{{/if}}
  @NewPassword()
  newPassword: string;
}

export class VerifyEmailDto {
{{#if SWAGGER}}
  @ApiProperty({ description: 'Token from the verification email' })
{{/if}}
  @IsString()
  @IsNotEmpty()
  @MaxLength(512)
  token: string;
}
{{#if SWAGGER}}

// ── responses (documentation) ────────────────────────────────────────────────

export class AuthTokensDto {
  @ApiProperty({ example: 'Bearer' }) tokenType: 'Bearer';
  @ApiProperty() accessToken: string;
  @ApiProperty({ description: 'Access token lifetime in seconds' }) expiresIn: number;
  @ApiProperty({ format: 'date-time' }) accessTokenExpiresAt: string;
{{#if AUTH_REFRESH}}
  @ApiProperty() refreshToken: string;
  @ApiProperty({ format: 'date-time' }) refreshTokenExpiresAt: string;
{{/if}}
}

export class AuthSessionDto {
  @ApiProperty({ type: UserResponseDto }) user: UserResponseDto;
  @ApiProperty({ type: AuthTokensDto }) tokens: AuthTokensDto;
}
{{/if}}
