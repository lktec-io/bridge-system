import { useCallback, useEffect, useRef, useState } from 'react';

const EMPTY = { rows: [], total: 0, page: 1, limit: 25, pages: 1 };

/**
 * One fetching primitive for every server-paginated list.
 *
 * Solves three problems the per-page `useEffect` fetches had:
 *
 *   1. **Cancellation** — each run gets an AbortSignal, and the previous
 *      request is aborted when params change. Without this, a slow earlier
 *      response can land after a newer one and overwrite fresh state.
 *   2. **Debounce** — typing in a search box no longer fires a query per
 *      keystroke; params are serialised and settled for `debounceMs` first.
 *   3. **Shape tolerance** — accepts both the paginated envelope and a bare
 *      array, so endpoints that have not been migrated still work.
 *
 * @param fetcher (params, config) => axios promise
 * @param params  plain object; changes trigger a refetch
 */
export default function usePaginatedQuery(fetcher, params, { debounceMs = 250, enabled = true } = {}) {
  const [data,    setData]    = useState(EMPTY);
  const [loading, setLoading] = useState(Boolean(enabled));
  const [error,   setError]   = useState('');
  const [reloadToken, setReloadToken] = useState(0);

  // Serialised params are the dependency: a new object with identical values
  // must not trigger a request.
  const key = JSON.stringify(params ?? {});

  // Keep the latest fetcher without making it a dependency (inline arrow
  // functions at the call site would otherwise refetch on every render).
  const fetcherRef = useRef(fetcher);
  useEffect(() => { fetcherRef.current = fetcher; }, [fetcher]);

  useEffect(() => {
    if (!enabled) return undefined;

    const controller = new AbortController();

    const timer = setTimeout(() => {
      setLoading(true);
      setError('');

      fetcherRef.current(JSON.parse(key), { signal: controller.signal })
        .then((res) => {
          if (controller.signal.aborted) return;
          const payload = res?.data ?? {};

          if (Array.isArray(payload)) {
            setData({
              rows: payload, total: payload.length,
              page: 1, limit: payload.length || 25, pages: 1,
            });
          } else {
            setData({
              rows:  payload.rows  ?? [],
              total: payload.total ?? 0,
              page:  payload.page  ?? 1,
              limit: payload.limit ?? 25,
              pages: payload.pages ?? 1,
            });
          }
          setLoading(false);
        })
        .catch((err) => {
          // A cancelled request was superseded — not an error state.
          if (controller.signal.aborted || err.code === 'ERR_CANCELED' || err.name === 'CanceledError') return;
          setError(err.response?.data?.message || 'Failed to load data');
          setLoading(false);
        });
    }, debounceMs);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [key, debounceMs, enabled, reloadToken]);

  const refetch = useCallback(() => setReloadToken((t) => t + 1), []);

  return { ...data, loading, error, refetch };
}
