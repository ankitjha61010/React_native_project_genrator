import type { Request, Response } from 'express';
import { config } from '{{IMPORT:config.env}}';
import { sendSuccess } from '{{IMPORT:ex.respond}}';
import { LEGAL_MESSAGES } from '{{IMPORT:messages.legal}}';

/** Handles `/legal`. The links come from .env, so they change without an app release. */
export class LegalController {
  /** GET /legal */
  links = (_req: Request, res: Response) => {
    sendSuccess(res, LEGAL_MESSAGES.links, config.legal);
  };
}
