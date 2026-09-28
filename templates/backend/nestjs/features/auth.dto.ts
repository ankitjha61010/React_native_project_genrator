import { Transform } from 'class-transformer';
import { {{#if SOCIAL}}IsIn, {{/if}}{{#if AUTH_EMAIL}}IsEmail, {{/if}}IsNotEmpty, IsOptional, IsString, {{#if CODES}}Matches, {{/if}}MaxLength{{#if AUTH_EMAIL}}, MinLength{{/if}} } from 'class-validator';
{{#if AUTH_EMAIL}}
import { config } from '{{IMPORT:config.env}}';
{{/if}}
{{#if SOCIAL}}
import { SOCIAL_PROVIDERS, type SocialProvider } from '{{IMPORT:domain.authTokens}}';
{{/if}}
import { trim } from '{{IMPORT:nest.commonDto}}';
import { UserResponseDto } from '{{IMPORT:nest.users.dto}}';

{{#if CODES}}
/** Dial code from the country picker, e.g. "+91". */
const DIAL_CODE = /^\+?\d{1,4}$/;
/** National number; spaces / dashes are ignored. */
const PHONE = /^[\d\s-]{4,20}$/;
{{/if}}
{{#if AUTH_EMAIL}}

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
  /** @example Jane Doe */
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  /** @example jane@example.com */
  @IsEmail()
  @MaxLength(255)
  email: string;

  /** Letters and numbers. @example Sup3rSecret */
  @NewPassword()
  password: string;

  /** Required with `phone`. @example +91 */
  @IsOptional()
  @Matches(DIAL_CODE, { message: 'countryCode must be a dial code like +91' })
  countryCode?: string;

  /** @example 9876543210 */
  @IsOptional()
  @Matches(PHONE, { message: 'phone must be a valid mobile number' })
  phone?: string;
}

export class LoginDto {
  /** @example jane@example.com */
  @IsEmail()
  @MaxLength(255)
  email: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(maxLength)
  password: string;
}

export class ChangePasswordDto {
  /** Not needed when the account has no password yet. */
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(maxLength)
  currentPassword?: string;

  @NewPassword()
  newPassword: string;
}

export class ForgotPasswordDto {
  @IsEmail()
  @MaxLength(255)
  email: string;
}

export class ResetPasswordDto {
  @IsEmail()
  @MaxLength(255)
  email: string;

  /** The code from the email. @example 123456 */
  @Matches(/^\d{4,8}$/, { message: 'code must be the code you received' })
  code: string;

  @NewPassword()
  newPassword: string;
}

export class VerifyEmailDto {
  /** @example 123456 */
  @Matches(/^\d{4,8}$/, { message: 'code must be the code you received' })
  code: string;
}
{{/if}}
{{#if AUTH_OTP}}

export class SendOtpDto {
  /** @example +91 */
  @Matches(DIAL_CODE, { message: 'countryCode must be a dial code like +91' })
  countryCode: string;

  /** @example 9876543210 */
  @Matches(PHONE, { message: 'phone must be a valid mobile number' })
  phone: string;
}

export class VerifyOtpDto extends SendOtpDto {
  /** The 6-digit SMS code. @example 123456 */
  @Matches(/^\d{6}$/, { message: 'otp must be the 6-digit code' })
  otp: string;

  /** Used when this creates the account. */
  @IsOptional()
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name?: string;
}
{{/if}}
{{#if SOCIAL}}

export class SocialLoginDto {
  @IsIn(SOCIAL_PROVIDERS)
  provider: SocialProvider;

  /** The token from the provider SDK. */
  @IsString()
  @MaxLength(8192)
  token: string;

  @IsIn(['idToken', 'accessToken', 'authenticationToken', 'identityToken'])
  tokenType: 'idToken' | 'accessToken' | 'authenticationToken' | 'identityToken';

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  authorizationCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  nonce?: string;

  /** Apple: the name the app received on the first sign-in. */
  @IsOptional()
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name?: string;
}
{{/if}}
{{#if AUTH_REFRESH}}

export class RefreshTokenDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2048)
  refreshToken: string;
}
{{/if}}

// ── responses (documentation) ────────────────────────────────────────────────

export class AuthTokensDto {
  tokenType: 'Bearer';
  accessToken: string;
  /** Access token lifetime in seconds. */
  expiresIn: number;
  accessTokenExpiresAt: string;
{{#if AUTH_REFRESH}}
  refreshToken: string;
  refreshTokenExpiresAt: string;
{{/if}}
}

export class SessionDto {
  user: UserResponseDto;
  tokens: AuthTokensDto;
{{#if PASSWORDLESS}}
  /** True when this sign-in created the account. */
  isNewUser?: boolean;
{{/if}}
}
{{#if CODES}}

export class SentCodeDto {
  /** Seconds until the code expires. */
  expiresIn: number;
  /** Seconds until a new code may be requested. */
  resendIn: number;
}
{{/if}}
