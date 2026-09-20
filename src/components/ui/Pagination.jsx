import { FiChevronLeft, FiChevronRight, FiChevronsLeft, FiChevronsRight } from 'react-icons/fi';

const LIMITS = [10, 25, 50, 100];

/** Compact page window: 1 … 4 5 [6] 7 8 … 20 */
function pageWindow(page, pages) {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);

  const out = new Set([1, pages, page]);
  for (let d = 1; d <= 2; d += 1) {
    if (page - d > 1)     out.add(page - d);
    if (page + d < pages) out.add(page + d);
  }
  const sorted = [...out].sort((a, b) => a - b);

  const withGaps = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) withGaps.push('gap');
    withGaps.push(p);
  });
  return withGaps;
}

export default function Pagination({
  page = 1, pages = 1, total = 0, limit = 25,
  onPage, onLimit, loading = false, unit = 'record',
}) {
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to   = Math.min(page * limit, total);

  return (
    <div className="pagination no-print">
      <div className="pagination-meta">
        <span className="mono">{from}–{to}</span> of <span className="mono">{total}</span> {unit}{total === 1 ? '' : 's'}
      </div>

      <div className="pagination-controls">
        <button
          className="btn btn-ghost btn-sm btn-icon"
          onClick={() => onPage(1)}
          disabled={page <= 1 || loading}
          aria-label="First page"
        >
          <FiChevronsLeft size={13} />
        </button>
        <button
          className="btn btn-ghost btn-sm btn-icon"
          onClick={() => onPage(page - 1)}
          disabled={page <= 1 || loading}
          aria-label="Previous page"
        >
          <FiChevronLeft size={13} />
        </button>

        {pageWindow(page, pages).map((p, i) =>
          p === 'gap' ? (
            <span key={`gap-${i}`} className="pagination-gap">…</span>
          ) : (
            <button
              key={p}
              className={`pagination-page${p === page ? ' active' : ''}`}
              onClick={() => onPage(p)}
              disabled={loading}
              aria-current={p === page ? 'page' : undefined}
            >
              {p}
            </button>
          )
        )}

        <button
          className="btn btn-ghost btn-sm btn-icon"
          onClick={() => onPage(page + 1)}
          disabled={page >= pages || loading}
          aria-label="Next page"
        >
          <FiChevronRight size={13} />
        </button>
        <button
          className="btn btn-ghost btn-sm btn-icon"
          onClick={() => onPage(pages)}
          disabled={page >= pages || loading}
          aria-label="Last page"
        >
          <FiChevronsRight size={13} />
        </button>
      </div>

      {onLimit && (
        <label className="pagination-limit">
          <span className="label-tech">Rows</span>
          <select
            className="form-control"
            value={limit}
            onChange={(e) => onLimit(Number(e.target.value))}
            disabled={loading}
          >
            {LIMITS.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </label>
      )}
    </div>
  );
}
