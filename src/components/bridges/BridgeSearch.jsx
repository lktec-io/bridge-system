import { MdSearch, MdFilterList, MdRefresh } from 'react-icons/md';

export default function BridgeSearch({ search, condition, dateFilter, sortBy, onChange, onApply, onClear }) {
  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <div className="card-body" style={{ padding: '16px 20px' }}>
        <div className="filter-bar" style={{ marginBottom: 12 }}>

          <div className="search-box" style={{ flex: 2 }}>
            <MdSearch />
            <input
              type="text"
              className="form-control"
              placeholder="Search serial number, section, structure type..."
              value={search}
              onChange={(e) => onChange('search', e.target.value)}
            />
          </div>

          <select
            className="form-control"
            style={{ width: 160 }}
            value={condition}
            onChange={(e) => onChange('condition', e.target.value)}
          >
            <option value="">All Conditions</option>
            <option value="GOOD">✅ Good</option>
            <option value="FAIR">⚠️ Fair</option>
            <option value="POOR">🔴 Poor</option>
          </select>

          <select
            className="form-control"
            style={{ width: 190 }}
            value={dateFilter}
            onChange={(e) => onChange('dateFilter', e.target.value)}
          >
            <option value="">All Inspection Dates</option>
            <option value="recent">Inspected (last 30 days)</option>
            <option value="3months">Inspected (last 3 months)</option>
            <option value="year">Inspected (this year)</option>
            <option value="never">Never inspected</option>
          </select>

          <select
            className="form-control"
            style={{ width: 160 }}
            value={sortBy}
            onChange={(e) => onChange('sortBy', e.target.value)}
          >
            <option value="created">Sort: Date Added</option>
            <option value="serial">Sort: Serial No.</option>
            <option value="chainage">Sort: Chainage</option>
          </select>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button type="button" className="btn btn-primary btn-sm" onClick={onApply}>
            <MdFilterList /> Apply Filters
          </button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onClear}>
            <MdRefresh /> Clear All
          </button>
        </div>
      </div>
    </div>
  );
}
