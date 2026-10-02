import { {{#if AUTH}}Body, {{/if}}Controller, Get{{#if AUTH}}, Put{{/if}} } from '@nestjs/common';
{{#if SWAGGER}}
import { ApiTags } from '@nestjs/swagger';
{{/if}}
import { LegalService } from '{{IMPORT:app.legalService}}';
{{#if AUTH}}
import { Public, RequirePermissions } from '{{IMPORT:nest.decorators}}';
{{/if}}
import { Endpoint } from '{{IMPORT:nest.endpoint}}';
import { LegalDto{{#if AUTH}}, UpdateLegalDto{{/if}} } from '{{IMPORT:nest.legal.dto}}';
import { LEGAL_MESSAGES } from '{{IMPORT:messages.legal}}';

/** `/legal` – the links the app opens + the pages edited in the admin panel. */
{{#if SWAGGER}}
@ApiTags('Legal')
{{/if}}
@Controller('legal')
export class LegalController {
  constructor(private readonly legal: LegalService) {}

{{#if AUTH}}
  @Public()
{{/if}}
  @Get()
  @Endpoint({ summary: 'Terms & Conditions / Privacy Policy links the app opens (admin panel, else TERMS_URL … in .env)', message: LEGAL_MESSAGES.links, response: LegalDto })
  get() {
    return this.legal.get();
  }
{{#if AUTH}}

  @Put()
  @RequirePermissions('legal:write')
  @Endpoint({ summary: 'Save the legal links / pages (admin)', message: LEGAL_MESSAGES.updated, response: LegalDto, errors: [401, 403, 422], bearer: true })
  update(@Body() dto: UpdateLegalDto) {
    return this.legal.update(dto);
  }
{{/if}}
}
