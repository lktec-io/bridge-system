import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  FiSearch, FiRefreshCw, FiCheckCircle, FiAlertTriangle,
  FiClipboard, FiTrash2, FiEye, FiAlertOctagon,
} from 'react-icons/fi';
import { inspectionsAPI } from '../api/bridges';
import { useAuth } from '../context/AuthContext';
import { ConditionBadge } from '../components/ui/Badge';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { fmtDate } from '../utils/format';

const EMPTY_FILTERS = { search: '', condition: '', resolved: '' };

export default function InspectionsList() {
  const { user, isAdmin } = useAuth();

  const [all,     setAll]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [busyId,  setBusyId]  = useState(null);
  const [error,   setError]   = useState('');

  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await inspectionsAPI.getAll();
      setAll(data);
    } catch {
      setAll([]);
      setError('Unable to load inspection records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

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

  const approve = async (ins) => {
    setBusyId(ins.id);
    setError('');
    try {
      await inspectionsAPI.resolve(ins.id, `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim());
      setAll((prev) => prev.map((i) =>
        i.id === ins.id ? { ...i, isResolved: true, resolvedBy: `${user?.firstName} ${user?.lastName}` } : i
      ));
    } catch (err) {
      setError(err.response?.data?.message || 'Could not sign off this inspection');
    } finally {
      setBusyId(null);
    }
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await inspectionsAPI.delete(pendingDelete.id);
      setAll((prev) => prev.filter((i) => i.id !== pendingDelete.id));
      setPendingDelete(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not delete this inspection');
      setPendingDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  const activeCount = Object.values(filters).filter(Boolean).length;

  if (loading) {
    return <div className="loading-center"><div className="spinner" /><span>Loading inspection log…</span></div>;
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Inspection Logs</h2>
          <p>
            {filtered.length} of {all.length} record(s)
            {activeCount > 0 && (
              <span className="chip chip-accent" style={{ marginLeft: 8 }}>
                {activeCount} filter(s) active
              </span>
            )}
          </p>
        </div>
        <button className="btn btn-ghost btn-sm no-print" onClick={load}>
          <FiRefreshCw size={13} /> Refresh
        </button>
      </div>

      {error && (
        <div className="alert alert-error" style={{ marginBottom: 'var(--sp-4)' }}>
          <FiAlertOctagon size={15} />
          <span style={{ flex: 1 }}>{error}</span>
          <button className="btn-close" onClick={() => setError('')}>×</button>
        </div>
      )}

      {/* Filters */}
      <div className="tile" style={{ marginBottom: 'var(--sp-4)' }}>
        <div className="card-body" style={{ padding: 'var(--sp-3) var(--sp-4)' }}>
          <div className="filter-bar" style={{ marginBottom: 'var(--sp-3)' }}>
            <div className="search-box" style={{ flex: 2 }}>
              <FiSearch />
              <input
                type="text"
                className="form-control"
                placeholder="Search bridge ID, region or inspector…"
                value={filters.search}
                onChange={(e) => handleFilter('search', e.target.value)}
              />
            </div>

            <select
              className="form-control" style={{ width: 165 }}
              value={filters.condition}
              onChange={(e) => handleFilter('condition', e.target.value)}
            >
              <option value="">All conditions</option>
              <option value="GOOD">Good</option>
              <option value="FAIR">Fair</option>
              <option value="POOR">Poor</option>
            </select>

            <select
              className="form-control" style={{ width: 195 }}
              value={filters.resolved}
              onChange={(e) => handleFilter('resolved', e.target.value)}
            >
              <option value="">Any defect status</option>
              <option value="no">Unresolved defects</option>
              <option value="yes">Signed off</option>
            </select>
          </div>

          <button className="btn btn-secondary btn-sm" onClick={clearFilters}>
            <FiRefreshCw size={12} /> Clear filters
          </button>
        </div>
      </div>

      {/* Records */}
      {filtered.length === 0 ? (
        <div className="tile">
          <div className="empty-state">
            <FiClipboard />
            <h3>No inspections found</h3>
            <p>
              {activeCount > 0
                ? 'No records match the current filters.'
                : 'Inspections are filed from an individual structure profile.'}
            </p>
            {activeCount > 0 && (
              <button className="btn btn-secondary btn-sm" onClick={clearFilters}>
                <FiRefreshCw size={12} /> Clear filters
              </button>
            )}
          </div>
        </div>
      ) : (
        <section className="ops-panel">
          <div className="ops-head">
            <span className="ops-title">
              <FiClipboard size={14} /> Inspection Records
              <span className="ops-count">{filtered.length}</span>
            </span>
          </div>
          <div className="ops-scroll">
            <table className="table ops-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Bridge ID</th>
                  <th>Region / Location</th>
                  <th>Inspector</th>
                  <th>Condition Rating</th>
                  <th>Defect Status</th>
                  <th>Defect Summary</th>
                  <th style={{ textAlign: 'right' }}>Operations</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((ins) => {
                  const openDefect = Boolean(ins.defectDescription) && !ins.isResolved;
                  return (
                    <tr key={ins.id} className={ins.conditionStatus === 'POOR' ? 'row-poor' : ''}>
                      <td className="mono" style={{ fontSize: 'var(--fs-xs)' }}>{fmtDate(ins.inspectionDate)}</td>
                      <td>
                        <Link to={`/bridges/${ins.bridgeId}`} className="serial-link">
                          {ins.bridge?.serialNumber ?? `#${ins.bridgeId}`}
                        </Link>
                      </td>
                      <td className="muted">{ins.bridge?.section ?? '—'}</td>
                      <td>{ins.inspectorName}</td>
                      <td><ConditionBadge status={ins.conditionStatus} /></td>
                      <td>
                        {!ins.defectDescription ? (
                          <span className="resolve-status resolved">
                            <FiCheckCircle size={11} /> None
                          </span>
                        ) : ins.isResolved ? (
                          <span className="resolve-status resolved">
                            <FiCheckCircle size={11} /> Signed off
                          </span>
                        ) : (
                          <span className="resolve-status unresolved">
                            <FiAlertTriangle size={11} /> Unresolved
                          </span>
                        )}
                      </td>
                      <td className="wrap-cell muted">
                        {ins.defectDescription
                          ? `${ins.defectDescription.slice(0, 90)}${ins.defectDescription.length > 90 ? '…' : ''}`
                          : '—'}
                      </td>
                      <td>
                        <div className="ops-actions no-print">
                          {openDefect ? (
                            <button
                              className="btn btn-outline-success btn-sm"
                              onClick={() => approve(ins)}
                              disabled={busyId === ins.id}
                              title="Approve — mark this defect resolved"
                            >
                              {busyId === ins.id ? <span className="spinner spinner-sm" /> : <FiCheckCircle size={12} />}
                              Approve
                            </button>
                          ) : (
                            <Link to={`/bridges/${ins.bridgeId}`} className="btn btn-ghost btn-sm">
                              <FiEye size={12} /> Review
                            </Link>
                          )}
                          {isAdmin && (
                            <button
                              className="btn btn-outline-danger btn-sm btn-icon"
                              onClick={() => setPendingDelete(ins)}
                              disabled={busyId === ins.id}
                              title="Hard delete this inspection"
                            >
                              <FiTrash2 size={12} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
        title="Hard delete inspection"
        message={pendingDelete
          ? `Permanently delete the ${pendingDelete.conditionStatus} inspection dated ${fmtDate(pendingDelete.inspectionDate)} for ${pendingDelete.bridge?.serialNumber ?? 'this structure'}? This cannot be undone.`
          : ''}
        confirmLabel="Hard delete"
        loading={deleting}
      />
    </div>
  );
}
