import { Body, Controller, Get, HttpCode{{#if STYLE_USECASE}}, Inject{{/if}}, Post } from '@nestjs/common';
{{#if SWAGGER}}
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
{{/if}}
{{#if STYLE_SERVICE}}
import { AuthService } from '{{IMPORT:app.authService}}';
{{else}}
import type { AuthUseCases } from '{{IMPORT:nest.auth.providers}}';
import { AUTH_USE_CASES } from '{{IMPORT:nest.tokens}}';
{{/if}}
import type { AuthResult, ClientContext } from '{{IMPORT:app.authTypes}}';
{{#if VIEWS}}
import { authView } from '{{IMPORT:views.auth}}';
import { userView } from '{{IMPORT:views.user}}';
import type { User } from '{{IMPORT:domain.user}}';
{{else}}
import { toPublicUser, type User } from '{{IMPORT:domain.user}}';
{{/if}}
{{#if SWAGGER}}
import { ApiEnvelope, ApiErrors } from '{{IMPORT:nest.apiResponses}}';
import { UserResponseDto } from '{{IMPORT:nest.users.dto}}';
{{/if}}
{{#if SEC_AUTH_RATE_LIMIT}}
import { AuthRateLimit, Client, CurrentUser, Public, ResponseMessage } from '{{IMPORT:nest.decorators}}';
{{else}}
import { Client, CurrentUser, Public, ResponseMessage } from '{{IMPORT:nest.decorators}}';
{{/if}}
import {
{{#if SWAGGER}}
  AuthSessionDto,
{{/if}}
  ChangePasswordDto,
  ForgotPasswordDto,
  LoginDto,
{{#if AUTH_REFRESH}}
  RefreshTokenDto,
{{/if}}
  RegisterDto,
  ResetPasswordDto,
  VerifyEmailDto,
} from '{{IMPORT:nest.auth.dto}}';

{{#if VIEWS}}
const session = (result: AuthResult) => authView.session(result);
const user = userView.one;
{{else}}
const session = (result: AuthResult) => ({ user: toPublicUser(result.user), tokens: result.tokens });
const user = toPublicUser;
{{/if}}

{{#if SWAGGER}}
@ApiTags('Auth')
{{/if}}
@Controller('auth')
export class AuthController {
  constructor({{#if STYLE_SERVICE}}private readonly auth: AuthService{{else}}@Inject(AUTH_USE_CASES) private readonly auth: AuthUseCases{{/if}}) {}

  @Public()
{{#if SEC_AUTH_RATE_LIMIT}}
  @AuthRateLimit()
{{/if}}
  @Post('register')
  @HttpCode(201)
{{#if SWAGGER}}
  @ApiOperation({ summary: 'Create an account (sends a verification email)' })
  @ApiEnvelope(AuthSessionDto, { status: 201, description: 'Registered' })
  @ApiErrors(409, 422, 429)
{{/if}}
  @ResponseMessage('Registered successfully')
  async register(@Body() dto: RegisterDto, @Client() client: ClientContext) {
    return session(await this.auth.register{{CALL}}(dto, client));
  }

  @Public()
{{#if SEC_AUTH_RATE_LIMIT}}
  @AuthRateLimit()
{{/if}}
  @Post('login')
  @HttpCode(200)
{{#if SWAGGER}}
  @ApiOperation({ summary: 'Log in with email + password' })
  @ApiEnvelope(AuthSessionDto, { description: 'Logged in' })
  @ApiErrors(401, 403{{#if SEC_LOCKOUT}}, 423{{/if}}, 422, 429)
{{/if}}
  @ResponseMessage('Logged in successfully')
  async login(@Body() dto: LoginDto, @Client() client: ClientContext) {
    return session(await this.auth.login{{CALL}}(dto, client));
  }
{{#if AUTH_REFRESH}}

  @Public()
{{#if SEC_AUTH_RATE_LIMIT}}
  @AuthRateLimit()
{{/if}}
  @Post('refresh')
  @HttpCode(200)
{{#if SWAGGER}}
{{#if AUTH_ROTATION}}
  @ApiOperation({ summary: 'New token pair for a refresh token (the used one is revoked; reusing it revokes the whole session)' })
{{else}}
  @ApiOperation({ summary: 'New access token for a refresh token' })
{{/if}}
  @ApiEnvelope(AuthSessionDto, { description: 'Refreshed' })
  @ApiErrors(401, 422, 429)
{{/if}}
  @ResponseMessage('Token refreshed')
  async refresh(@Body() dto: RefreshTokenDto, @Client() client: ClientContext) {
    return session(await this.auth.refresh{{CALL}}(dto.refreshToken, client));
  }

  @Public()
  @Post('logout')
  @HttpCode(200)
{{#if SWAGGER}}
  @ApiOperation({ summary: 'End the session of a refresh token' })
  @ApiEnvelope(null, { description: 'Logged out' })
  @ApiErrors(422)
{{/if}}
  @ResponseMessage('Logged out')
  async logout(@Body() dto: RefreshTokenDto) {
    await this.auth.logout{{CALL}}(dto.refreshToken);
    return null;
  }

  @Post('logout-all')
  @HttpCode(200)
{{#if SWAGGER}}
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Log out on every device' })
  @ApiEnvelope(null, { description: 'Logged out everywhere' })
  @ApiErrors(401)
{{/if}}
  @ResponseMessage('Logged out on all devices')
  async logoutAll(@CurrentUser() current: User) {
    await this.auth.logoutAll{{CALL}}(current.id);
    return null;
  }
{{else}}

  @Post('logout')
  @HttpCode(200)
{{#if SWAGGER}}
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Log out (invalidates every token of the user)' })
  @ApiEnvelope(null, { description: 'Logged out' })
  @ApiErrors(401)
{{/if}}
  @ResponseMessage('Logged out')
  async logout(@CurrentUser() current: User) {
    await this.auth.logout{{CALL}}(current.id);
    return null;
  }
{{/if}}

  @Get('me')
{{#if SWAGGER}}
  @ApiBearerAuth()
  @ApiOperation({ summary: 'The signed-in user' })
  @ApiEnvelope(UserResponseDto, { description: 'Current user' })
  @ApiErrors(401)
{{/if}}
  @ResponseMessage('Current user')
  async me(@CurrentUser() current: User) {
    return user(await this.auth.getCurrentUser{{CALL}}(current.id));
  }

{{#if SEC_AUTH_RATE_LIMIT}}
  @AuthRateLimit()
{{/if}}
  @Post('change-password')
  @HttpCode(200)
{{#if SWAGGER}}
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change the password (other sessions are signed out)' })
  @ApiEnvelope(AuthSessionDto, { description: 'Password changed' })
  @ApiErrors(400, 401, 422, 429)
{{/if}}
  @ResponseMessage('Password changed')
  async changePassword(@CurrentUser() current: User, @Body() dto: ChangePasswordDto, @Client() client: ClientContext) {
    return session(await this.auth.changePassword{{CALL}}(current.id, dto, client));
  }

  @Public()
{{#if SEC_AUTH_RATE_LIMIT}}
  @AuthRateLimit()
{{/if}}
  @Post('forgot-password')
  @HttpCode(200)
{{#if SWAGGER}}
  @ApiOperation({ summary: 'Send a password reset link (always succeeds)' })
  @ApiEnvelope(null, { description: 'Reset link sent if the email exists' })
  @ApiErrors(422, 429)
{{/if}}
  @ResponseMessage('If the email is registered, a reset link has been sent')
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.auth.requestPasswordReset{{CALL}}(dto.email);
    return null;
  }

  @Public()
{{#if SEC_AUTH_RATE_LIMIT}}
  @AuthRateLimit()
{{/if}}
  @Post('reset-password')
  @HttpCode(200)
{{#if SWAGGER}}
  @ApiOperation({ summary: 'Set a new password with the token from the email' })
  @ApiEnvelope(null, { description: 'Password reset' })
  @ApiErrors(400, 422, 429)
{{/if}}
  @ResponseMessage('Password has been reset, please log in')
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.auth.resetPassword{{CALL}}(dto.token, dto.newPassword);
    return null;
  }

  @Public()
{{#if SEC_AUTH_RATE_LIMIT}}
  @AuthRateLimit()
{{/if}}
  @Post('verify-email')
  @HttpCode(200)
{{#if SWAGGER}}
  @ApiOperation({ summary: 'Confirm the email address with the token from the email' })
  @ApiEnvelope(UserResponseDto, { description: 'Email verified' })
  @ApiErrors(400, 422, 429)
{{/if}}
  @ResponseMessage('Email verified')
  async verifyEmail(@Body() dto: VerifyEmailDto) {
    return user(await this.auth.verifyEmail{{CALL}}(dto.token));
  }

{{#if SEC_AUTH_RATE_LIMIT}}
  @AuthRateLimit()
{{/if}}
  @Post('verify-email/request')
  @HttpCode(200)
{{#if SWAGGER}}
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Send the verification email again' })
  @ApiEnvelope(null, { description: 'Verification email sent' })
  @ApiErrors(401, 409, 429)
{{/if}}
  @ResponseMessage('Verification email sent')
  async requestEmailVerification(@CurrentUser() current: User) {
    await this.auth.requestEmailVerification{{CALL}}(current.id);
    return null;
  }
}
