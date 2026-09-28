import type { User } from '{{IMPORT:domain.user}}';

declare global {
  namespace Express {
    interface Request {
      /** Set by the `authenticate` middleware. */
      user?: User;
    }
  }
}
