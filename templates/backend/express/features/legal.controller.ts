import type { Request, Response } from 'express';
import type { LegalService } from '{{IMPORT:app.legalService}}';
import { sendSuccess } from '{{IMPORT:ex.respond}}';
{{#if AUTH}}
import { parseBody } from '{{IMPORT:ex.validation}}';
import { updateLegalSchema } from '{{IMPORT:ex.legal.schemas}}';
{{/if}}
import { LEGAL_MESSAGES } from '{{IMPORT:messages.legal}}';

/** Handles `/legal`: the links the app opens + the pages edited in the admin panel. */
export class LegalController {
  constructor(private readonly legal: LegalService) {}

  /** GET /legal */
  get = async (_req: Request, res: Response) => {
    sendSuccess(res, LEGAL_MESSAGES.links, await this.legal.get());
  };
{{#if AUTH}}

  /** PUT /legal (admin) */
  update = async (req: Request, res: Response) => {
    const body = parseBody(updateLegalSchema, req);
    sendSuccess(res, LEGAL_MESSAGES.updated, await this.legal.update(body));
  };
{{/if}}
}
