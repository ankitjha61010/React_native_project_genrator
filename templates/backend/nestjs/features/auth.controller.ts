import { Body, Controller, Get, Post } from '@nestjs/common';
{{#if SWAGGER}}
import { ApiTags } from '@nestjs/swagger';
{{/if}}
import { AuthService } from '{{IMPORT:app.authService}}';
import type { ClientContext } from '{{IMPORT:app.authTypes}}';
{{#if VIEWS}}
import { authView } from '{{IMPORT:views.auth}}';
import { userView } from '{{IMPORT:views.user}}';
import type { User } from '{{IMPORT:domain.user}}';
{{else}}
import { toSessionView } from '{{IMPORT:app.authTypes}}';
import { toPublicUser, type User } from '{{IMPORT:domain.user}}';
{{/if}}
import { AuthRateLimit, Client, CurrentUser, Public } from '{{IMPORT:nest.decorators}}';
import { Endpoint } from '{{IMPORT:nest.endpoint}}';
import { UserResponseDto } from '{{IMPORT:nest.users.dto}}';
import {
{{#if AUTH_EMAIL}}
  ChangePasswordDto,
  ForgotPasswordDto,
  LoginDto,
  RegisterDto,
  ResetPasswordDto,
  VerifyEmailDto,
{{/if}}
{{#if CODES}}
  SentCodeDto,
{{/if}}
{{#if AUTH_OTP}}
  SendOtpDto,
  VerifyOtpDto,
{{/if}}
{{#if SOCIAL}}
  SocialLoginDto,
{{/if}}
{{#if AUTH_REFRESH}}
  RefreshTokenDto,
{{/if}}
  SessionDto,
} from '{{IMPORT:nest.auth.dto}}';

{{#if VIEWS}}
const session = authView.session;
const publicUser = userView.one;
{{else}}
const session = toSessionView;
const publicUser = toPublicUser;
{{/if}}

/** `/auth` – {{AUTH_METHODS_TEXT}}, sessions. */
{{#if SWAGGER}}
@ApiTags('Auth')
{{/if}}
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}
{{#if AUTH_EMAIL}}

  @Public()
  @AuthRateLimit()
  @Post('register')
  @Endpoint({ summary: 'Create an account with email + password (a verification code is emailed)', message: 'Registered successfully', status: 201, response: SessionDto, errors: [409, 422, 429] })
  async register(@Body() dto: RegisterDto, @Client() client: ClientContext) {
    return session(await this.auth.register(dto, client));
  }

  @Public()
  @AuthRateLimit()
  @Post('login')
  @Endpoint({ summary: 'Log in with email + password', message: 'Logged in successfully', status: 200, response: SessionDto, errors: [401, 403{{#if SEC_LOCKOUT}}, 423{{/if}}, 422, 429] })
  async login(@Body() dto: LoginDto, @Client() client: ClientContext) {
    return session(await this.auth.login(dto, client));
  }
{{/if}}
{{#if AUTH_OTP}}

  @Public()
  @AuthRateLimit()
  @Post('otp/send')
  @Endpoint({ summary: 'Text a 6-digit login code to a mobile number', message: 'Code sent', status: 200, response: SentCodeDto, errors: [422, 429] })
  sendOtp(@Body() dto: SendOtpDto) {
    return this.auth.sendOtp(dto);
  }

  @Public()
  @AuthRateLimit()
  @Post('otp/verify')
  @Endpoint({ summary: 'Sign in with the SMS code (creates the account on the first login)', message: 'Logged in successfully', status: 200, response: SessionDto, errors: [400, 403, 422, 429] })
  async verifyOtp(@Body() dto: VerifyOtpDto, @Client() client: ClientContext) {
    return session(await this.auth.verifyOtp(dto, client));
  }
{{/if}}
{{#if SOCIAL}}

  @Public()
  @AuthRateLimit()
  @Post('social')
  @Endpoint({ summary: 'Sign in with {{SOCIAL_PROVIDERS_TEXT}} (the token from the provider SDK is verified with the provider)', message: 'Logged in successfully', status: 200, response: SessionDto, errors: [401, 403, 422, 429] })
  async social(@Body() dto: SocialLoginDto, @Client() client: ClientContext) {
    return session(await this.auth.socialLogin(dto, client));
  }
{{/if}}
{{#if AUTH_REFRESH}}

  @Public()
  @AuthRateLimit()
  @Post('refresh')
{{#if AUTH_ROTATION}}
  @Endpoint({ summary: 'New token pair for a refresh token (the used one is revoked; reusing it revokes the whole session)', message: 'Token refreshed', status: 200, response: SessionDto, errors: [401, 422, 429] })
{{else}}
  @Endpoint({ summary: 'New access token for a refresh token', message: 'Token refreshed', status: 200, response: SessionDto, errors: [401, 422, 429] })
{{/if}}
  async refresh(@Body() dto: RefreshTokenDto, @Client() client: ClientContext) {
    return session(await this.auth.refresh(dto.refreshToken, client));
  }

  @Public()
  @Post('logout')
  @Endpoint({ summary: 'End the session of a refresh token', message: 'Logged out', status: 200, errors: [422] })
  async logout(@Body() dto: RefreshTokenDto) {
    await this.auth.logout(dto.refreshToken);
  }

  @Post('logout-all')
  @Endpoint({ summary: 'Log out on every device', message: 'Logged out on all devices', status: 200, errors: [401], bearer: true })
  async logoutAll(@CurrentUser() user: User) {
    await this.auth.logoutAll(user.id);
  }
{{else}}

  @Post('logout')
  @Endpoint({ summary: 'Log out (invalidates every token of the user)', message: 'Logged out', status: 200, errors: [401], bearer: true })
  async logout(@CurrentUser() user: User) {
    await this.auth.logout(user.id);
  }
{{/if}}

  @Get('me')
  @Endpoint({ summary: 'The signed-in user', message: 'Current user', response: UserResponseDto, errors: [401], bearer: true })
  async me(@CurrentUser() user: User) {
    return publicUser(await this.auth.getCurrentUser(user.id));
  }
{{#if AUTH_EMAIL}}

  @AuthRateLimit()
  @Post('change-password')
  @Endpoint({ summary: 'Change (or set) the password – other sessions are signed out', message: 'Password changed', status: 200, response: SessionDto, errors: [400, 401, 422, 429], bearer: true })
  async changePassword(@CurrentUser() user: User, @Body() dto: ChangePasswordDto, @Client() client: ClientContext) {
    return session(await this.auth.changePassword(user.id, dto, client));
  }

  @Public()
  @AuthRateLimit()
  @Post('forgot-password')
  @Endpoint({ summary: 'Email a 6-digit password reset code (always succeeds)', message: 'If the email is registered, a reset code has been sent', status: 200, errors: [422, 429] })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.auth.requestPasswordReset(dto.email);
  }

  @Public()
  @AuthRateLimit()
  @Post('reset-password')
  @Endpoint({ summary: 'Set a new password with the emailed code', message: 'Password has been reset, please log in', status: 200, errors: [400, 422, 429] })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.auth.resetPassword(dto);
  }

  @AuthRateLimit()
  @Post('verify-email/request')
  @Endpoint({ summary: 'Email a verification code', message: 'Verification code sent', status: 200, response: SentCodeDto, errors: [400, 401, 409, 429], bearer: true })
  requestEmailVerification(@CurrentUser() user: User) {
    return this.auth.requestEmailVerification(user.id);
  }

  @AuthRateLimit()
  @Post('verify-email')
  @Endpoint({ summary: 'Confirm the email address with the emailed code', message: 'Email verified', status: 200, response: UserResponseDto, errors: [400, 401, 422, 429], bearer: true })
  async verifyEmail(@CurrentUser() user: User, @Body() dto: VerifyEmailDto) {
    return publicUser(await this.auth.verifyEmail(user.id, dto.code));
  }
{{/if}}
}
