import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { inspectionsAPI } from '../api/bridges';
import { format } from 'date-fns';
import {
  MdFindInPage, MdRefresh, MdSearch,
  MdCheckCircle, MdWarning,
} from 'react-icons/md';
import { FiCheckCircle } from 'react-icons/fi';
import { ConditionBadge } from '../components/ui/Badge';

const EMPTY_FILTERS = { search: '', condition: '', resolved: '' };

export default function InspectionsList() {
  const [all,     setAll]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState(EMPTY_FILTERS);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await inspectionsAPI.getAll();
        setAll(data);
      } catch { setAll([]); }
      finally  { setLoading(false); }
    })();
  }, []);

  const handleFilter = (key, val) => setFilters((f) => ({ ...f, [key]: val }));
  const clearFilters = () => setFilters(EMPTY_FILTERS);

  const filtered = useMemo(() => {
    let list = all;
    if (filters.condition) list = list.filter((i) => i.conditionStatus === filters.condition);
    if (filters.resolved === 'yes') list = list.filter((i) => i.isResolved);
    if (filters.resolved === 'no')  list = list.filter((i) => !i.isResolved && i.defectDescription);
    if (filters.search) {
      const q = filters.search.toLowerCase();
      list = list.filter((i) =>
        i.bridge?.serialNumber?.toLowerCase().includes(q) ||
        i.bridge?.section?.toLowerCase().includes(q)     ||
        i.inspectorName?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [all, filters]);

  const activeCount = Object.values(filters).filter(Boolean).length;

  if (loading) return <div className="loading-center"><div className="spinner" /><span>Loading inspections...</span></div>;

  return (
    <div>
      {/* ── Header ────────────────────────────────────────── */}
      <div className="page-header">
        <div>
          <h2>All Inspections</h2>
          <p>
            {filtered.length} of {all.length} record(s)
            {activeCount > 0 && (
              <span style={{ marginLeft: 8, fontSize: 12, background: 'var(--primary-light)', color: 'var(--primary)', padding: '2px 8px', borderRadius: 99, fontWeight: 700 }}>
                {activeCount} filter(s) active
              </span>
            )}
          </p>
        </div>
      </div>

      {/* ── Filter bar ────────────────────────────────────── */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-body" style={{ padding: '16px 20px' }}>
          <div className="filter-bar" style={{ marginBottom: 12 }}>

            <div className="search-box" style={{ flex: 2 }}>
              <MdSearch />
              <input
                type="text"
                className="form-control"
                placeholder="Search bridge, section or inspector..."
                value={filters.search}
                onChange={(e) => handleFilter('search', e.target.value)}
              />
            </div>

            <select
              className="form-control" style={{ width: 170 }}
              value={filters.condition}
              onChange={(e) => handleFilter('condition', e.target.value)}
            >
              <option value="">All Conditions</option>
              <option value="GOOD">Good</option>
              <option value="FAIR">Fair</option>
              <option value="POOR">Poor</option>
            </select>

            <select
              className="form-control" style={{ width: 180 }}
              value={filters.resolved}
              onChange={(e) => handleFilter('resolved', e.target.value)}
            >
              <option value="">All Defect Status</option>
              <option value="no">Unresolved defects</option>
              <option value="yes">Resolved defects</option>
            </select>
          </div>

          <button className="btn btn-secondary btn-sm" onClick={clearFilters}>
            <MdRefresh /> Clear Filters
          </button>
        </div>
      </div>

      {/* ── Table ─────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div className="card">
          <div className="empty-state" style={{ padding: '60px 24px' }}>
            <MdFindInPage />
            <h3>No inspections found</h3>
            <p>
              {activeCount > 0
                ? 'Try adjusting or clearing your filters.'
                : 'Inspections are added from individual bridge profiles.'
              }
            </p>
            {activeCount > 0 && (
              <button className="btn btn-secondary btn-sm" onClick={clearFilters}>
                <MdRefresh /> Clear Filters
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="table-wrapper inspections-table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Bridge</th>
                <th>Section</th>
                <th>Inspector</th>
                <th>Condition</th>
                <th>Defect Status</th>
                <th>Defect Summary</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((ins) => (
                <tr key={ins.id} className={ins.conditionStatus === 'POOR' ? 'row-poor' : ''}>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    {format(new Date(ins.inspectionDate), 'dd MMM yyyy')}
                  </td>
                  <td>
                    <Link to={`/bridges/${ins.bridgeId}`} style={{ color: 'var(--primary)', fontWeight: 700 }}>
                      {ins.bridge?.serialNumber}
                    </Link>
                  </td>
                  <td className="muted">{ins.bridge?.section ?? '—'}</td>
                  <td>{ins.inspectorName}</td>
                  <td><ConditionBadge status={ins.conditionStatus} /></td>
                  <td>
                    {!ins.defectDescription ? (
                      <span style={{ fontSize: 12, color: 'var(--success)', display: 'inline-flex', alignItems: 'center', gap: 3 }}><FiCheckCircle size={12} /> None</span>
                    ) : ins.isResolved ? (
                      <span className="resolve-status resolved" style={{ fontSize: 11 }}>
                        <MdCheckCircle size={12} /> Resolved
                      </span>
                    ) : (
                      <span className="resolve-status unresolved" style={{ fontSize: 11 }}>
                        <MdWarning size={12} /> Unresolved
                      </span>
                    )}
                  </td>
                  <td style={{ maxWidth: 260, fontSize: 13, color: 'var(--text-muted)' }}>
                    {ins.defectDescription
                      ? ins.defectDescription.length > 70
                        ? `${ins.defectDescription.slice(0, 70)}…`
                        : ins.defectDescription
                      : '—'
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
