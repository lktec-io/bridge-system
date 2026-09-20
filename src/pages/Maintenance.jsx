import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FiTool, FiPlus, FiRefreshCw, FiTrash2, FiAlertTriangle,
  FiSearch, FiDollarSign, FiClock, FiCheckCircle,
} from 'react-icons/fi';
import { maintenanceAPI, MAINTENANCE_TYPES, MAINTENANCE_STATUSES } from '../api/maintenance';
import { bridgesAPI } from '../api/bridges';
import { useAuth } from '../context/AuthContext';
import KpiBlock from '../components/dashboard/KpiBlock';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { fmtDate } from '../utils/format';

const EMPTY_FORM = {
  bridgeId: '', maintenanceType: 'ROUTINE', description: '',
  cost: '', maintenanceDate: '', performedBy: '', status: 'PLANNED',
};

const money = (v) =>
  v === null || v === undefined ? '—' : Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function Maintenance() {
  const { isAdmin } = useAuth();

  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState(null);
  const [bridges, setBridges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [moduleMissing, setModuleMissing] = useState(false);
  const [error, setError] = useState('');

  const [filters, setFilters] = useState({ search: '', status: '', type: '' });

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const [recRes, sumRes, brRes] = await Promise.allSettled([
      maintenanceAPI.getAll(),
      maintenanceAPI.getSummary(),
      bridgesAPI.getAll(),
    ]);

    if (recRes.status === 'fulfilled') {
      setRecords(recRes.value.data);
      setModuleMissing(false);
    } else {
      // A 500 here almost always means maintenance_records is absent.
      const status = recRes.reason?.response?.status;
      setModuleMissing(status === 500 || status === undefined);
      setError(recRes.reason?.response?.data?.message || 'Unable to load maintenance records');
    }

    if (sumRes.status === 'fulfilled') setSummary(sumRes.value.data);
    if (brRes.status  === 'fulfilled') {
      const d = brRes.value.data;
      setBridges(Array.isArray(d) ? d : (d.bridges ?? []));
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    let list = records;
    if (filters.status) list = list.filter((r) => r.status === filters.status);
    if (filters.type)   list = list.filter((r) => r.maintenanceType === filters.type);
    if (filters.search) {
      const q = filters.search.toLowerCase();
      list = list.filter((r) =>
        r.bridge?.serialNumber?.toLowerCase().includes(q) ||
        r.bridge?.section?.toLowerCase().includes(q) ||
        r.performedBy?.toLowerCase().includes(q) ||
        r.description?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [records, filters]);

  const submit = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!form.bridgeId || !form.description || !form.maintenanceDate || !form.performedBy) {
      setFormError('Structure, description, scheduled date and performed by are required');
      return;
    }
    setSaving(true);
    try {
      await maintenanceAPI.create(form);
      setFormOpen(false);
      setForm(EMPTY_FORM);
      load();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Could not save this work order');
    } finally {
      setSaving(false);
    }
  };

  const advance = async (record, status) => {
    setBusyId(record.id);
    try {
      await maintenanceAPI.update(record.id, { status });
      setRecords((prev) => prev.map((r) => (r.id === record.id ? { ...r, status } : r)));
      maintenanceAPI.getSummary().then(({ data }) => setSummary(data)).catch(() => {});
    } catch (err) {
      setError(err.response?.data?.message || 'Could not update status');
    } finally {
      setBusyId(null);
    }
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await maintenanceAPI.delete(pendingDelete.id);
      setRecords((prev) => prev.filter((r) => r.id !== pendingDelete.id));
      setPendingDelete(null);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not delete this work order');
      setPendingDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  if (moduleMissing) {
    return (
      <div>
        <div className="page-header">
          <div>
            <h2>Maintenance Schedules</h2>
            <p>Planned, active and completed maintenance works</p>
          </div>
        </div>
        <div className="stub-notice">
          <h3>Maintenance table not present in this database</h3>
          <p>
            The API returned an error reading <code>maintenance_records</code>. The table is
            defined in <code>server/database/schema.sql</code> but this database does not
            appear to have it — most likely the schema was applied before the maintenance
            module existed.
          </p>
          <p>
            Apply the table definition from <code>server/database/schema.sql</code> (the
            <code> maintenance_records</code> block) and reload this page. No other module
            is affected meanwhile.
          </p>
          {error && <p style={{ color: 'var(--poor)' }}>{error}</p>}
          <div>
            <button className="btn btn-secondary btn-sm" onClick={load}>
              <FiRefreshCw size={13} /> Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Maintenance Schedules</h2>
          <p>
            {loading ? 'Loading…' : `${filtered.length} of ${records.length} work order(s)`}
          </p>
        </div>
        <div className="toolbar no-print">
          <button className="btn btn-ghost btn-sm" onClick={load} disabled={loading}>
            <FiRefreshCw size={13} /> Refresh
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => setFormOpen(true)}>
            <FiPlus size={13} /> New work order
          </button>
        </div>
      </div>

      {error && !moduleMissing && (
        <div className="alert alert-error" style={{ marginBottom: 'var(--sp-4)' }}>
          <FiAlertTriangle size={15} />
          <span style={{ flex: 1 }}>{error}</span>
          <button className="btn-close" onClick={() => setError('')}>×</button>
        </div>
      )}

      {/* Summary metrics */}
      <div className="kpi-grid">
        <KpiBlock
          label="Open Work Orders" icon={FiTool}
          value={summary?.open ?? 0}
          note={`${summary?.byStatus?.PLANNED ?? 0} planned · ${summary?.byStatus?.IN_PROGRESS ?? 0} active`}
        />
        <KpiBlock
          label="Emergency Orders Active" icon={FiAlertTriangle}
          tone={(summary?.emergencyOpen ?? 0) > 0 ? 'critical' : 'good'}
          value={summary?.emergencyOpen ?? 0}
          note="Type EMERGENCY, not yet completed"
        />
        <KpiBlock
          label="Past Scheduled Date" icon={FiClock}
          tone={(summary?.plannedOverdue ?? 0) > 0 ? 'fair' : 'good'}
          value={summary?.plannedOverdue ?? 0}
          note="Open orders with a date in the past"
        />
        <KpiBlock
          label="Completed Spend (YTD)" icon={FiDollarSign}
          tone="accent"
          value={money(summary?.spendYtd ?? 0)}
          note="Sum of cost on completed orders this year"
        />
      </div>

      {/* Filters */}
      <div className="tile" style={{ marginBottom: 'var(--sp-4)' }}>
        <div className="card-body" style={{ padding: 'var(--sp-3) var(--sp-4)' }}>
          <div className="filter-bar">
            <div className="search-box">
              <FiSearch />
              <input
                className="form-control"
                placeholder="Search structure, contractor or scope…"
                value={filters.search}
                onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
              />
            </div>
            <select
              className="form-control" style={{ width: 170 }}
              value={filters.status}
              onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
            >
              <option value="">All statuses</option>
              {MAINTENANCE_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            <select
              className="form-control" style={{ width: 170 }}
              value={filters.type}
              onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value }))}
            >
              <option value="">All types</option>
              {MAINTENANCE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setFilters({ search: '', status: '', type: '' })}
            >
              <FiRefreshCw size={12} /> Clear
            </button>
          </div>
        </div>
      </div>

      {/* Records */}
      {loading ? (
        <div className="loading-center"><div className="spinner" /><span>Loading work orders…</span></div>
      ) : filtered.length === 0 ? (
        <div className="tile">
          <div className="empty-state">
            <FiTool />
            <h3>No work orders</h3>
            <p>
              {records.length === 0
                ? 'No maintenance has been recorded against any structure yet.'
                : 'No work orders match the current filters.'}
            </p>
            <button className="btn btn-primary btn-sm" onClick={() => setFormOpen(true)}>
              <FiPlus size={13} /> New work order
            </button>
          </div>
        </div>
      ) : (
        <section className="ops-panel">
          <div className="ops-head">
            <span className="ops-title">
              <FiTool size={14} /> Work Orders
              <span className="ops-count">{filtered.length}</span>
            </span>
          </div>
          <div className="ops-scroll">
            <table className="table ops-table">
              <thead>
                <tr>
                  <th>Structure</th>
                  <th>Type</th>
                  <th>Scope</th>
                  <th>Scheduled</th>
                  <th>Performed By</th>
                  <th className="num">Cost</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Operations</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className={r.maintenanceType === 'EMERGENCY' && r.status !== 'COMPLETED' ? 'row-critical' : ''}>
                    <td>
                      <Link to={`/bridges/${r.bridgeId}`} className="serial-link">
                        {r.bridge?.serialNumber ?? `#${r.bridgeId}`}
                      </Link>
                      <div className="muted" style={{ fontSize: 'var(--fs-micro)' }}>{r.bridge?.section ?? ''}</div>
                    </td>
                    <td><span className={`maint-type ${r.maintenanceType.toLowerCase()}`}>{r.maintenanceType}</span></td>
                    <td className="wrap-cell muted">{r.description}</td>
                    <td className="mono" style={{ fontSize: 'var(--fs-xs)' }}>{fmtDate(r.maintenanceDate)}</td>
                    <td className="muted">{r.performedBy}</td>
                    <td className="num">{money(r.cost)}</td>
                    <td><span className={`status-pill ${r.status.toLowerCase()}`}>{r.status.replace('_', ' ')}</span></td>
                    <td>
                      <div className="ops-actions no-print">
                        {r.status === 'PLANNED' && (
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => advance(r, 'IN_PROGRESS')}
                            disabled={busyId === r.id}
                          >
                            Start
                          </button>
                        )}
                        {r.status === 'IN_PROGRESS' && (
                          <button
                            className="btn btn-outline-success btn-sm"
                            onClick={() => advance(r, 'COMPLETED')}
                            disabled={busyId === r.id}
                          >
                            <FiCheckCircle size={12} /> Complete
                          </button>
                        )}
                        {isAdmin && (
                          <button
                            className="btn btn-outline-danger btn-sm"
                            onClick={() => setPendingDelete(r)}
                            disabled={busyId === r.id}
                            title="Hard delete this work order"
                          >
                            <FiTrash2 size={12} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* New work order */}
      <Modal
        open={formOpen}
        onClose={() => { setFormOpen(false); setFormError(''); }}
        title="New maintenance work order"
        maxWidth={600}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setFormOpen(false)} disabled={saving}>Cancel</button>
            <button className="btn btn-primary" onClick={submit} disabled={saving}>
              {saving ? <><span className="spinner spinner-sm" /> Saving…</> : 'Create work order'}
            </button>
          </>
        }
      >
        <form onSubmit={submit}>
          {formError && (
            <div className="alert alert-error" style={{ marginBottom: 'var(--sp-3)' }}>
              <FiAlertTriangle size={14} /><span>{formError}</span>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Structure</label>
            <select
              className="form-control"
              value={form.bridgeId}
              onChange={(e) => setForm((f) => ({ ...f, bridgeId: e.target.value }))}
            >
              <option value="">Select a structure…</option>
              {bridges.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.serialNumber} — {b.section}
                </option>
              ))}
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Type</label>
              <select
                className="form-control"
                value={form.maintenanceType}
                onChange={(e) => setForm((f) => ({ ...f, maintenanceType: e.target.value }))}
              >
                {MAINTENANCE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select
                className="form-control"
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              >
                {MAINTENANCE_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Scope of works</label>
            <textarea
              className="form-control"
              placeholder="Describe the works to be carried out…"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>

          <div className="form-row-3">
            <div className="form-group">
              <label className="form-label">Scheduled date</label>
              <input
                type="date" className="form-control mono"
                value={form.maintenanceDate}
                onChange={(e) => setForm((f) => ({ ...f, maintenanceDate: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Performed by</label>
              <input
                className="form-control"
                placeholder="Contractor or unit"
                value={form.performedBy}
                onChange={(e) => setForm((f) => ({ ...f, performedBy: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Cost</label>
              <input
                type="number" step="0.01" min="0" className="form-control mono"
                placeholder="0.00"
                value={form.cost}
                onChange={(e) => setForm((f) => ({ ...f, cost: e.target.value }))}
              />
            </div>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
        title="Hard delete work order"
        message={pendingDelete
          ? `Permanently delete the ${pendingDelete.maintenanceType} work order scheduled ${fmtDate(pendingDelete.maintenanceDate)} for ${pendingDelete.bridge?.serialNumber ?? 'this structure'}? This cannot be undone.`
          : ''}
        confirmLabel="Hard delete"
        loading={deleting}
      />
    </div>
  );
}
