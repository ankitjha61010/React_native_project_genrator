export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export interface PageQuery {
  page: number;
  limit: number;
  search?: string;
}

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/** A page of items. The HTTP layer puts `items` into `data` and `meta` into `meta`. */
export class Paginated<T> {
  constructor(
    readonly items: T[],
    readonly meta: PageMeta,
  ) {}

  static of<T>(items: T[], total: number, query: PageQuery): Paginated<T> {
    const totalPages = Math.max(1, Math.ceil(total / query.limit));
    return new Paginated(items, {
      page: query.page,
      limit: query.limit,
      total,
      totalPages,
      hasNextPage: query.page < totalPages,
      hasPreviousPage: query.page > 1,
    });
  }

  map<U>(mapper: (item: T) => U): Paginated<U> {
    return new Paginated(this.items.map(mapper), this.meta);
  }
}

export function pageOffset(query: PageQuery): number {
  return (query.page - 1) * query.limit;
}
