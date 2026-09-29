import { Router } from 'express';
import { LegalController } from '{{IMPORT:ex.legal.controller}}';

/** `/legal` – Terms & Conditions / Privacy Policy links for the app (public). */
export function legalRoutes(): Router {
  const router = Router();
  const legal = new LegalController();

  router.get('/', legal.links);
  return router;
}
