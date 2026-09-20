import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FiFileText, FiRefreshCw, FiAlertOctagon, FiFilter,
} from 'react-icons/fi';
import { historyAPI } from '../api/bridges';
import usePaginatedQuery from '../hooks/usePaginatedQuery';
import Pagination from '../components/ui/Pagination';
import { fmtDateTime } from '../utils/format';

/* Action types are written by historyService inside the transaction that
   caused them. Anything unmapped still renders, humanised. */
const ACTION_META = {
  CREATE:               { label: 'Structure registered', tone: 'info' },
  UPDATE:               { label: 'Structure updated',    tone: 'muted' },
  BRIDGE_DELETED:       { label: 'Structure deleted',    tone: 'poor' },
  INSPECTION_ADDED:     { label: 'Inspection filed',     tone: 'accent' },
  INSPECTION_UPDATED:   { label: 'Inspection amended',   tone: 'muted' },
  INSPECTION_DELETED:   { label: 'Inspection deleted',   tone: 'poor' },
  DEFECT_RESOLVED:      { label: 'Defect signed off',    tone: 'good' },
  PHOTO_UPLOADED:       { label: 'Imagery attached',     tone: 'info' },
  MAINTENANCE_LOGGED:   { label: 'Work order raised',    tone: 'accent' },
  MAINTENANCE_UPDATED:  { label: 'Work order updated',   tone: 'muted' },
  MAINTENANCE_DELETED:  { label: 'Work order deleted',   tone: 'poor' },
};

const TONE_STYLE = {
  info:   { background: 'var(--info-light)',   color: 'var(--info)' },
  good:   { background: 'var(--good-light)',   color: 'var(--good)' },
  accent: { background: 'var(--accent-light)', color: 'var(--accent-darker)' },
  poor:   { background: 'var(--poor-light)',   color: 'var(--poor)' },
  muted:  { background: 'var(--bg-sunken)',    color: 'var(--text-muted)' },
};

const meta = (action) =>
  ACTION_META[action] ?? { label: (action ?? 'System event').replace(/_/g, ' ').toLowerCase(), tone: 'muted' };

/** Renders the changed-field summary without dumping raw JSON at the reader. */
function ChangeSummary({ oldValues, newValues }) {
  const keys = Object.keys(newValues ?? {});
  if (keys.length === 0) return <span className="muted">—</span>;

  return (
    <span className="log-changes">
      {keys.slice(0, 4).map((k) => (
        <span key={k} className="log-change">
          <span className="log-change-key">{k}</span>
          {oldValues?.[k] !== undefined && (
            <>
              <span className="log-change-old">{String(oldValues[k] ?? '∅').slice(0, 24)}</span>
              <span className="log-change-arrow">→</span>
            </>
          )}
          <span className="log-change-new">{String(newValues[k] ?? '∅').slice(0, 24)}</span>
        </span>
      ))}
      {keys.length > 4 && <span className="muted">+{keys.length - 4} more</span>}
    </span>
  );
}

/**
 * System Logs — the audit trail, paginated in MySQL.
 *
 * Read-only by design: history rows are written inside the transaction that
 * produced them and are never edited afterwards.
 */
export default function SystemLogs() {
  const [params, setParams] = useState({ page: 1, limit: 50, actionType: '' });
  const [actions, setActions] = useState([]);

  const { rows, total, page, pages, limit, loading, error, refetch } =
    usePaginatedQuery(historyAPI.getAll, params);

  useEffect(() => {
    let cancelled = false;
    historyAPI.getActions()
      .then(({ data }) => { if (!cancelled) setActions(Array.isArray(data) ? data : []); })
      .catch(() => { /* filter list is optional — the table still works */ });
    return () => { cancelled = true; };
  }, []);

  const patch = useCallback((changes) => {
    setParams((prev) => ({ ...prev, ...changes, page: 'page' in changes ? changes.page : 1 }));
  }, []);

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>System Logs</h2>
          <p>
            {loading && total === 0
              ? 'Querying audit trail…'
              : `${total} recorded event(s) · page ${page} of ${pages}`}
          </p>
        </div>
        <button className="btn btn-ghost btn-sm no-print" onClick={refetch} disabled={loading}>
          <FiRefreshCw size={13} /> Refresh
        </button>
      </div>

      {error && (
        <div className="alert alert-error" style={{ marginBottom: 'var(--sp-4)' }}>
          <FiAlertOctagon size={15} />
          <span style={{ flex: 1 }}>{error}</span>
        </div>
      )}

      <div className="tile" style={{ marginBottom: 'var(--sp-4)' }}>
        <div className="card-body" style={{ padding: 'var(--sp-3) var(--sp-4)' }}>
          <div className="filter-bar">
            <span className="label-tech" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <FiFilter size={12} /> Event type
            </span>
            <select
              className="form-control" style={{ width: 240 }}
              value={params.actionType}
              onChange={(e) => patch({ actionType: e.target.value })}
            >
              <option value="">All event types</option>
              {actions.map((a) => (
                <option key={a} value={a}>{meta(a).label}</option>
              ))}
            </select>
            {params.actionType && (
              <button className="btn btn-secondary btn-sm" onClick={() => patch({ actionType: '' })}>
                <FiRefreshCw size={12} /> Clear
              </button>
            )}
            <span className="toolbar-spacer" />
            <span className="muted" style={{ fontSize: 'var(--fs-xs)' }}>
              Newest first · written inside the originating transaction
            </span>
          </div>
        </div>
      </div>

      {loading && rows.length === 0 ? (
        <div className="loading-center"><div className="spinner" /><span>Querying audit trail…</span></div>
      ) : rows.length === 0 ? (
        <div className="tile">
          <div className="empty-state">
            <FiFileText />
            <h3>No events recorded</h3>
            <p>
              {params.actionType
                ? 'No events of this type have been recorded.'
                : 'The audit trail is empty — no structures have been created or amended yet.'}
            </p>
          </div>
        </div>
      ) : (
        <div style={{ opacity: loading ? 0.6 : 1, transition: 'opacity 120ms' }}>
          <section className="ops-panel">
            <div className="ops-head">
              <span className="ops-title">
                <FiFileText size={14} /> Audit Trail
                <span className="ops-count">{total}</span>
              </span>
            </div>
            <div className="ops-scroll">
              <table className="table ops-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Event</th>
                    <th>Structure</th>
                    <th>Operator</th>
                    <th>Changes</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((log) => {
                    const m = meta(log.actionType);
                    return (
                      <tr key={log.id}>
                        <td className="mono" style={{ fontSize: 'var(--fs-xs)' }}>
                          {fmtDateTime(log.createdAt)}
                        </td>
                        <td>
                          <span className="badge" style={TONE_STYLE[m.tone]}>{m.label}</span>
                        </td>
                        <td>
                          {log.bridge ? (
                            <Link to={`/bridges/${log.bridgeId}`} className="serial-link">
                              {log.bridge.serialNumber}
                            </Link>
                          ) : (
                            <span className="muted mono" style={{ fontSize: 'var(--fs-xs)' }}>
                              #{log.bridgeId} (removed)
                            </span>
                          )}
                          {log.bridge?.section && (
                            <div className="muted" style={{ fontSize: 'var(--fs-micro)' }}>{log.bridge.section}</div>
                          )}
                        </td>
                        <td className="muted">
                          {log.user ? `${log.user.firstName} ${log.user.lastName}` : 'System'}
                        </td>
                        <td className="wrap-cell">
                          <ChangeSummary oldValues={log.oldValues} newValues={log.newValues} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <Pagination
            page={page}
            pages={pages}
            total={total}
            limit={limit}
            loading={loading}
            unit="event"
            onPage={(p) => patch({ page: p })}
            onLimit={(l) => patch({ limit: l })}
          />
        </div>
      )}
    </div>
  );
}
