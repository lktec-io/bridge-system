import { FiSearch, FiFilter, FiRefreshCw } from 'react-icons/fi';

export default function BridgeSearch({
  search, condition, dateFilter, sortBy, onChange, onApply, onClear,
}) {
  const submitOnEnter = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); onApply(); }
  };

  return (
    <div className="tile" style={{ marginBottom: 'var(--sp-4)' }}>
      <div className="card-body" style={{ padding: 'var(--sp-3) var(--sp-4)' }}>
        <div className="filter-bar" style={{ marginBottom: 'var(--sp-3)' }}>

          <div className="search-box" style={{ flex: 2 }}>
            <FiSearch />
            <input
              type="text"
              className="form-control"
              placeholder="Search bridge ID, region or material type…"
              value={search}
              onChange={(e) => onChange('search', e.target.value)}
              onKeyDown={submitOnEnter}
            />
          </div>

          <select
            className="form-control" style={{ width: 165 }}
            value={condition}
            onChange={(e) => onChange('condition', e.target.value)}
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
            onChange={(e) => onChange('dateFilter', e.target.value)}
          >
            <option value="">Any inspection date</option>
            <option value="recent">Last 30 days</option>
            <option value="3months">Last 3 months</option>
            <option value="year">This year</option>
            <option value="never">Never inspected</option>
          </select>

          <select
            className="form-control" style={{ width: 175 }}
            value={sortBy}
            onChange={(e) => onChange('sortBy', e.target.value)}
          >
            <option value="created">Sort: date added</option>
            <option value="serial">Sort: bridge ID</option>
            <option value="chainage">Sort: chainage</option>
          </select>
        </div>

        <div className="toolbar">
          <button type="button" className="btn btn-primary btn-sm" onClick={onApply}>
            <FiFilter size={12} /> Apply filters
          </button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onClear}>
            <FiRefreshCw size={12} /> Clear all
          </button>
        </div>
      </div>
    </div>
  );
}
