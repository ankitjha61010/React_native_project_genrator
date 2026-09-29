import { z } from 'zod';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '{{IMPORT:core.pagination}}';

/** `/:id` */
export const idParams = z.object({ id: z.string().min(1).max(64) });

/** `?page=1&limit=20` */
export const pageQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
});

/** `?page=1&limit=20&search=jane` */
export const searchPageQuery = pageQuery.extend({ search: z.string().trim().max(100).optional() });
