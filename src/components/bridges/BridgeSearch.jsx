import { FiSearch, FiRefreshCw, FiX } from 'react-icons/fi';

/**
 * Filter bar for the inventory.
 *
 * There is no Apply button: every change updates the query params, and
 * usePaginatedQuery debounces and cancels in-flight requests, so filtering is
 * immediate without hammering MySQL. All filtering runs server-side.
 */
export default function BridgeSearch({ values, onChange, onClear, resultCount, loading }) {
  const { search = '', condition = '', dateFilter = '', sortBy = 'created', sortDir = 'desc' } = values;
  const activeCount = [search, condition, dateFilter].filter(Boolean).length;

  return (
    <div className="tile" style={{ marginBottom: 'var(--sp-4)' }}>
      <div className="card-body" style={{ padding: 'var(--sp-3) var(--sp-4)' }}>
        <div className="filter-bar">

          <div className="search-box" style={{ flex: 2 }}>
            <FiSearch />
            <input
              type="text"
              className="form-control"
              placeholder="Search bridge ID, name, region or material type…"
              value={search}
              onChange={(e) => onChange({ search: e.target.value })}
            />
            {search && (
              <button
                className="input-trailing-btn"
                onClick={() => onChange({ search: '' })}
                aria-label="Clear search"
              >
                <FiX size={13} />
              </button>
            )}
          </div>

          <select
            className="form-control" style={{ width: 165 }}
            value={condition}
            onChange={(e) => onChange({ condition: e.target.value })}
            aria-label="Condition filter"
          >
            <option value="">All conditions</option>
            <option value="GOOD">Good</option>
            <option value="FAIR">Fair</option>
            <option value="POOR">Poor</option>
            <option value="NEVER">Uninspected</option>
          </select>

          <select
            className="form-control" style={{ width: 195 }}
            value={dateFilter}
            onChange={(e) => onChange({ dateFilter: e.target.value })}
            aria-label="Inspection date filter"
          >
            <option value="">Any inspection date</option>
            <option value="recent">Last 30 days</option>
            <option value="3months">Last 3 months</option>
            <option value="year">This year</option>
            <option value="overdue">Overdue (6 months+)</option>
            <option value="never">Never inspected</option>
          </select>

          <select
            className="form-control" style={{ width: 185 }}
            value={`${sortBy}:${sortDir}`}
            onChange={(e) => {
              const [nextSort, nextDir] = e.target.value.split(':');
              onChange({ sortBy: nextSort, sortDir: nextDir });
            }}
            aria-label="Sort order"
          >
            <option value="created:desc">Newest first</option>
            <option value="created:asc">Oldest first</option>
            <option value="serial:asc">Bridge ID A–Z</option>
            <option value="serial:desc">Bridge ID Z–A</option>
            <option value="chainage:asc">Chainage ascending</option>
            <option value="chainage:desc">Chainage descending</option>
            <option value="condition:desc">Condition (worst first)</option>
          </select>
        </div>

        <div className="toolbar" style={{ marginTop: 'var(--sp-3)' }}>
          {activeCount > 0 ? (
            <>
              <span className="chip chip-accent">{activeCount} filter(s) active</span>
              <button type="button" className="btn btn-secondary btn-sm" onClick={onClear}>
                <FiRefreshCw size={12} /> Clear filters
              </button>
            </>
          ) : (
            <span className="muted" style={{ fontSize: 'var(--fs-xs)' }}>
              Filtering and sorting run in MySQL — only the current page is transferred.
            </span>
          )}
          <span className="toolbar-spacer" />
          <span className="muted mono" style={{ fontSize: 'var(--fs-xs)' }}>
            {loading ? 'querying…' : `${resultCount ?? 0} matching`}
          </span>
        </div>
      </div>
    </div>
  );
}
