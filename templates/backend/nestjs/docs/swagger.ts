import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { config } from '{{IMPORT:config.env}}';

/** Swagger UI at /<API_PREFIX>/<SWAGGER_PATH>, raw document at …/openapi.json. */
export function setupSwagger(app: INestApplication): void {
  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('{{DISPLAY_NAME}} API')
      .setDescription('Every response uses the envelope `{ success, message, data, meta }`; errors use `{ success: false, message, code, errors }`.')
      .setVersion('1.0.0')
{{#if AUTH}}
      .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT', description: 'Access token from /auth/login or /auth/register' })
{{/if}}
      .build(),
  );
  const path = `${config.api.prefix}/${config.swagger.path}`;
  SwaggerModule.setup(path, app, document, {
    jsonDocumentUrl: `${path}/openapi.json`,
    customSiteTitle: '{{DISPLAY_NAME}} API',
  });
}
