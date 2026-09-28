import { Module } from '@nestjs/common';
{{#if STYLE_SERVICE}}
import { AuthService } from '{{IMPORT:app.authService}}';
{{else}}
import { AUTH_USE_CASES } from '{{IMPORT:nest.tokens}}';
{{/if}}
import { AuthController } from '{{IMPORT:nest.auth.controller}}';
import { authProviders } from '{{IMPORT:nest.auth.providers}}';
import { UsersModule } from '{{IMPORT:nest.users.module}}';

/** Exports what the global JwtAuthGuard needs to authenticate requests. */
@Module({
  imports: [UsersModule],
  controllers: [AuthController],
  providers: authProviders,
  exports: [{{#if STYLE_SERVICE}}AuthService{{else}}AUTH_USE_CASES{{/if}}],
})
export class AuthModule {}
