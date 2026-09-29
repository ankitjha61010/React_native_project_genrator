import { useCallback, useEffect, useRef, useState } from 'react';
import { errorMessage } from '{{IMPORT:api.errors}}';
import { userApi, type UserSummary } from '{{IMPORT:api.user}}';
import { flash } from '{{IMPORT:utils.flashMessage}}';

const SEARCH_DELAY_MS = 300;

/**
 * People to chat with: everybody A → Z right away, 20 at a time (more on scroll). The search
 * box only narrows the list down.
 */
export function useUserList() {
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const page = useRef({ current: 0, hasNext: true, search: '' });

  const loadPage = useCallback(async (term: string, nextPage: number) => {
    const result = await userApi.search({ search: term, page: nextPage });
    // Ignore answers for an older search term.
    if (page.current.search !== term) return;
    page.current = { current: nextPage, hasNext: result.meta.hasNextPage, search: term };
    setUsers(previous => (nextPage === 1 ? result.items : [...previous, ...result.items.filter(u => !previous.some(p => p.id === u.id))]));
  }, []);

  // First page on open, and again (debounced) whenever the search changes.
  useEffect(() => {
    const term = search.trim();
    page.current = { current: 0, hasNext: true, search: term };
    setLoading(true);
    const timer = setTimeout(
      () =>
        loadPage(term, 1)
          .catch(error => flash.error({ message: errorMessage(error) }))
          .finally(() => setLoading(false)),
      term ? SEARCH_DELAY_MS : 0,
    );
    return () => clearTimeout(timer);
  }, [search, loadPage]);

  const loadMore = useCallback(async () => {
    if (loading || loadingMore || !page.current.hasNext) return;
    setLoadingMore(true);
    try {
      await loadPage(page.current.search, page.current.current + 1);
    } catch (error) {
      flash.error({ message: errorMessage(error) });
    } finally {
      setLoadingMore(false);
    }
  }, [loadPage, loading, loadingMore]);

  return { users, search, setSearch, loading, loadingMore, loadMore };
}
