import { Controller, Get } from '@nestjs/common';
{{#if SWAGGER}}
import { ApiTags } from '@nestjs/swagger';
{{/if}}
import { config } from '{{IMPORT:config.env}}';
{{#if AUTH}}
import { Public } from '{{IMPORT:nest.decorators}}';
{{/if}}
import { Endpoint } from '{{IMPORT:nest.endpoint}}';
import { LEGAL_MESSAGES } from '{{IMPORT:messages.legal}}';

/** Response of GET /legal (documentation). */
class LegalLinksDto {
  termsUrl: string;
  privacyPolicyUrl: string;
{{#if DELETE_ACCOUNT}}
  deleteAccountUrl: string;
{{/if}}
}

/** `/legal` – the links come from .env, so they change without an app release. */
{{#if SWAGGER}}
@ApiTags('Legal')
{{/if}}
{{#if AUTH}}
@Public()
{{/if}}
@Controller('legal')
export class LegalController {
  @Get()
  @Endpoint({ summary: 'Terms & Conditions / Privacy Policy links the app opens (TERMS_URL … in .env)', message: LEGAL_MESSAGES.links, response: LegalLinksDto })
  links(): LegalLinksDto {
    return config.legal;
  }
}
