import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FiCpu, FiActivity, FiAlertTriangle, FiRefreshCw, FiPlus,
  FiTrash2, FiWifiOff, FiDatabase,
} from 'react-icons/fi';
import { sensorsAPI, SENSOR_TYPES } from '../api/sensors';
import { bridgesAPI } from '../api/bridges';
import { useAuth } from '../context/AuthContext';
import KpiBlock from '../components/dashboard/KpiBlock';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { fmtDateTime } from '../utils/format';

const WINDOWS = [
  { hours: 24,  label: '24h' },
  { hours: 168, label: '7d'  },
  { hours: 720, label: '30d' },
];

const EMPTY_DEVICE = {
  bridgeId: '', deviceCode: '', sensorType: 'VIBRATION', unit: '',
  location: '', warnThreshold: '', alarmThreshold: '',
};

const statusTone = (s) => (s === 'ALARM' ? 'alarm' : s === 'WARN' ? 'warn' : 'ok');

/* Pure-CSS sparkline: bar height is the reading's share of the window max. */
function Sparkline({ readings = [] }) {
  if (readings.length === 0) return null;
  const max = Math.max(...readings.map((r) => Math.abs(r.value)), 0.0001);
  return (
    <div className="spark" role="img" aria-label={`${readings.length} readings`}>
      {readings.slice(-48).map((r) => (
        <span
          key={r.id}
          className={`spark-bar${r.status !== 'OK' ? ' hot' : ''}`}
          style={{ height: `${Math.max((Math.abs(r.value) / max) * 100, 2)}%` }}
          title={`${r.value} · ${r.status} · ${fmtDateTime(r.recordedAt)}`}
        />
      ))}
    </div>
  );
}

export default function SensorAnalytics() {
  const { isAdmin } = useAuth();

  const [devices, setDevices] = useState([]);
  const [summary, setSummary] = useState(null);
  const [bridges, setBridges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [moduleMissing, setModuleMissing] = useState(false);
  const [error, setError] = useState('');

  const [selected, setSelected] = useState(null);
  const [readings, setReadings] = useState([]);
  const [window_, setWindow_] = useState(24);
  const [readingsLoading, setReadingsLoading] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_DEVICE);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const [devRes, sumRes, brRes] = await Promise.allSettled([
      sensorsAPI.getDevices(),
      sensorsAPI.getSummary(),
      bridgesAPI.getAll(),
    ]);

    if (devRes.status === 'fulfilled') {
      setDevices(devRes.value.data);
      setModuleMissing(false);
    } else {
      const status = devRes.reason?.response?.status;
      setModuleMissing(status === 500 || status === undefined);
      setError(devRes.reason?.response?.data?.message || 'Unable to load sensor devices');
    }
    if (sumRes.status === 'fulfilled') setSummary(sumRes.value.data);
    if (brRes.status  === 'fulfilled') {
      const d = brRes.value.data;
      setBridges(Array.isArray(d) ? d : (d.bridges ?? []));
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openDevice = useCallback(async (device, hours = window_) => {
    setSelected(device);
    setReadingsLoading(true);
    try {
      const { data } = await sensorsAPI.getReadings(device.id, { hours });
      setReadings(data);
    } catch {
      setReadings([]);
    } finally {
      setReadingsLoading(false);
    }
  }, [window_]);

  const changeWindow = (hours) => {
    setWindow_(hours);
    if (selected) openDevice(selected, hours);
  };

  const submit = async (e) => {
    e?.preventDefault();
    setFormError('');
    if (!form.bridgeId || !form.deviceCode || !form.sensorType) {
      setFormError('Structure, device code and sensor type are required');
      return;
    }
    setSaving(true);
    try {
      await sensorsAPI.createDevice(form);
      setFormOpen(false);
      setForm(EMPTY_DEVICE);
      load();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Could not register this device');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await sensorsAPI.deleteDevice(pendingDelete.id);
      setDevices((prev) => prev.filter((d) => d.id !== pendingDelete.id));
      if (selected?.id === pendingDelete.id) { setSelected(null); setReadings([]); }
      setPendingDelete(null);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not delete this device');
      setPendingDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  // ── Module not migrated ────────────────────────────────────
  if (moduleMissing) {
    return (
      <div>
        <div className="page-header">
          <div>
            <h2>Sensor / IoT Analytics</h2>
            <p>Structural telemetry streams and threshold breaches</p>
          </div>
        </div>
        <div className="stub-notice">
          <h3>Telemetry tables not present in this database</h3>
          <p>
            The sensor module needs two tables that this database does not have yet:
            <code>sensor_devices</code> and <code>sensor_readings</code>.
          </p>
          <p>
            Apply <code>server/database/migrations/001_sensor_telemetry.sql</code>. It only
            adds tables — it never alters or drops existing ones, and it is safe to re-run.
            Everything else in the system keeps working until then.
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

  const alarms = summary?.byStatus?.ALARM ?? 0;
  const warns  = summary?.byStatus?.WARN ?? 0;

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Sensor / IoT Analytics</h2>
          <p>{loading ? 'Loading…' : `${devices.length} device(s) registered`}</p>
        </div>
        <div className="toolbar no-print">
          <button className="btn btn-ghost btn-sm" onClick={load} disabled={loading}>
            <FiRefreshCw size={13} /> Refresh
          </button>
          {isAdmin && (
            <button className="btn btn-primary btn-sm" onClick={() => setFormOpen(true)}>
              <FiPlus size={13} /> Register device
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="alert alert-error" style={{ marginBottom: 'var(--sp-4)' }}>
          <FiAlertTriangle size={15} />
          <span style={{ flex: 1 }}>{error}</span>
          <button className="btn-close" onClick={() => setError('')}>×</button>
        </div>
      )}

      <div className="kpi-grid">
        <KpiBlock label="Registered Devices" icon={FiCpu}
          value={summary?.deviceCount ?? 0}
          note={`${summary?.activeCount ?? 0} active · ${summary?.bridgesMonitored ?? 0} structure(s)`} />
        <KpiBlock label="Devices In Alarm" icon={FiAlertTriangle}
          tone={alarms > 0 ? 'critical' : 'good'}
          value={alarms}
          note="Latest reading at or above alarm threshold" />
        <KpiBlock label="Devices In Warning" icon={FiActivity}
          tone={warns > 0 ? 'fair' : 'good'}
          value={warns}
          note="Latest reading above warn threshold" />
        <KpiBlock label="Readings (24h)" icon={FiDatabase}
          tone="accent"
          value={summary?.readings24h ?? 0}
          note="Samples ingested in the last 24 hours" />
      </div>

      {/* No hardware yet — say so plainly instead of drawing empty charts */}
      {!loading && devices.length === 0 && (
        <div className="stub-notice" style={{ marginBottom: 'var(--sp-4)' }}>
          <h3>No sensors instrumented yet</h3>
          <p>
            The telemetry tables exist, but no devices are registered, so there is nothing to
            plot. Register a device{isAdmin ? ' with the button above' : ' (administrator access required)'},
            then have the field gateway post readings to{' '}
            <code>POST /api/sensors/readings</code> with{' '}
            <code>{'{ deviceCode, value, recordedAt }'}</code>.
          </p>
          <p>
            Readings are classified at write time against each device's warn and alarm
            thresholds, and an alarm crossing raises a notification once — not on every
            sample while the breach persists.
          </p>
        </div>
      )}

      {/* Device fleet */}
      {devices.length > 0 && (
        <>
          <div className="sensor-grid" style={{ marginBottom: 'var(--sp-4)' }}>
            {devices.map((d) => (
              <button
                key={d.id}
                className={`sensor-tile ${statusTone(d.latest?.status)}`}
                onClick={() => openDevice(d)}
                style={{ textAlign: 'left', cursor: 'pointer' }}
              >
                <div className="kpi-head">
                  <span className="kpi-label">{d.deviceCode}</span>
                  <span className={`status-pill ${d.latest?.status === 'ALARM' ? 'in_progress' : 'completed'}`}
                        style={d.latest?.status === 'ALARM'
                          ? { background: 'var(--poor-light)', color: 'var(--poor)' }
                          : d.latest?.status === 'WARN'
                            ? { background: 'var(--fair-light)', color: 'var(--fair)' }
                            : undefined}>
                    {d.latest?.status ?? 'NO DATA'}
                  </span>
                </div>

                <div className="sensor-reading">
                  <span>{d.latest ? d.latest.value : '—'}</span>
                  {d.unit && <span className="sensor-unit">{d.unit}</span>}
                </div>

                <div className="kpi-foot">
                  <span>{d.sensorType.replace('_', ' ')}</span>
                  {d.stale
                    ? <span className="kpi-delta down"><FiWifiOff size={11} /> stale</span>
                    : <span className="muted mono" style={{ fontSize: 'var(--fs-micro)' }}>
                        {d.latest ? fmtDateTime(d.latest.recordedAt) : 'never reported'}
                      </span>}
                </div>

                <div className="muted" style={{ fontSize: 'var(--fs-micro)' }}>
                  {d.bridge?.serialNumber ?? `#${d.bridgeId}`}
                  {d.location ? ` · ${d.location}` : ''}
                </div>
              </button>
            ))}
          </div>

          {/* Selected device detail */}
          {selected && (
            <section className="ops-panel">
              <div className="ops-head">
                <span className="ops-title">
                  <FiActivity size={14} /> {selected.deviceCode}
                  <span className="ops-count">{selected.sensorType.replace('_', ' ')}</span>
                </span>
                <div className="toolbar">
                  <div className="seg">
                    {WINDOWS.map((w) => (
                      <button
                        key={w.hours}
                        className={`seg-btn${window_ === w.hours ? ' active' : ''}`}
                        onClick={() => changeWindow(w.hours)}
                      >
                        {w.label}
                      </button>
                    ))}
                  </div>
                  {selected.bridgeId && (
                    <Link to={`/bridges/${selected.bridgeId}`} className="btn btn-ghost btn-sm">
                      Structure
                    </Link>
                  )}
                  {isAdmin && (
                    <button className="btn btn-outline-danger btn-sm" onClick={() => setPendingDelete(selected)}>
                      <FiTrash2 size={12} /> Remove device
                    </button>
                  )}
                </div>
              </div>

              <div className="card-body">
                <div className="detail-grid" style={{ marginBottom: 'var(--sp-4)' }}>
                  <div className="detail-field">
                    <span className="label-tech">Latest</span>
                    <strong className="measure">
                      {selected.latest ? `${selected.latest.value} ${selected.unit ?? ''}` : '—'}
                    </strong>
                  </div>
                  <div className="detail-field">
                    <span className="label-tech">Warn threshold</span>
                    <strong className="measure">{selected.warnThreshold ?? '—'}</strong>
                  </div>
                  <div className="detail-field">
                    <span className="label-tech">Alarm threshold</span>
                    <strong className="measure">{selected.alarmThreshold ?? '—'}</strong>
                  </div>
                  <div className="detail-field">
                    <span className="label-tech">Last seen</span>
                    <strong className="measure">
                      {selected.lastSeenAt ? fmtDateTime(selected.lastSeenAt) : 'never'}
                    </strong>
                  </div>
                </div>

                {readingsLoading ? (
                  <div className="loading-center"><div className="spinner" /><span>Loading telemetry…</span></div>
                ) : readings.length === 0 ? (
                  <div className="empty-state">
                    <FiActivity />
                    <h3>No readings in this window</h3>
                    <p>This device has not reported inside the selected period.</p>
                  </div>
                ) : (
                  <>
                    <Sparkline readings={readings} />
                    <div className="table-wrapper" style={{ marginTop: 'var(--sp-4)', maxHeight: 280, overflowY: 'auto' }}>
                      <table className="table table-compact">
                        <thead>
                          <tr>
                            <th>Recorded</th>
                            <th className="num">Value</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[...readings].reverse().map((r) => (
                            <tr key={r.id}>
                              <td className="mono" style={{ fontSize: 'var(--fs-xs)' }}>{fmtDateTime(r.recordedAt)}</td>
                              <td className="num">{r.value}{selected.unit ? ` ${selected.unit}` : ''}</td>
                              <td>
                                <span className="badge" style={
                                  r.status === 'ALARM' ? { background: 'var(--poor-light)', color: 'var(--poor)' }
                                  : r.status === 'WARN' ? { background: 'var(--fair-light)', color: 'var(--fair)' }
                                  : { background: 'var(--good-light)', color: 'var(--good)' }
                                }>{r.status}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            </section>
          )}
        </>
      )}

      {/* Register device */}
      <Modal
        open={formOpen}
        onClose={() => { setFormOpen(false); setFormError(''); }}
        title="Register sensor device"
        maxWidth={600}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setFormOpen(false)} disabled={saving}>Cancel</button>
            <button className="btn btn-primary" onClick={submit} disabled={saving}>
              {saving ? <><span className="spinner spinner-sm" /> Saving…</> : 'Register device'}
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

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Structure</label>
              <select
                className="form-control"
                value={form.bridgeId}
                onChange={(e) => setForm((f) => ({ ...f, bridgeId: e.target.value }))}
              >
                <option value="">Select a structure…</option>
                {bridges.map((b) => (
                  <option key={b.id} value={b.id}>{b.serialNumber} — {b.section}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Device code</label>
              <input
                className="form-control mono"
                placeholder="TLT-BRG003-P4"
                value={form.deviceCode}
                onChange={(e) => setForm((f) => ({ ...f, deviceCode: e.target.value }))}
              />
              <div className="form-hint">Must be unique — this is the ingest identifier.</div>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Sensor type</label>
              <select
                className="form-control"
                value={form.sensorType}
                onChange={(e) => {
                  const t = SENSOR_TYPES.find((s) => s.value === e.target.value);
                  setForm((f) => ({ ...f, sensorType: e.target.value, unit: f.unit || (t?.unit ?? '') }));
                }}
              >
                {SENSOR_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Unit</label>
              <input
                className="form-control mono"
                placeholder="mm/s"
                value={form.unit}
                onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Position on structure</label>
            <input
              className="form-control"
              placeholder="Pier 4 bearing, mid-span soffit…"
              value={form.location}
              onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Warn threshold</label>
              <input
                type="number" step="0.0001" className="form-control mono"
                value={form.warnThreshold}
                onChange={(e) => setForm((f) => ({ ...f, warnThreshold: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Alarm threshold</label>
              <input
                type="number" step="0.0001" className="form-control mono"
                value={form.alarmThreshold}
                onChange={(e) => setForm((f) => ({ ...f, alarmThreshold: e.target.value }))}
              />
            </div>
          </div>
          <div className="form-hint">
            Thresholds compare against the reading's absolute value, so negative swings
            (tilt, displacement) are classified on magnitude.
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
        title="Remove sensor device"
        message={pendingDelete
          ? `Remove ${pendingDelete.deviceCode} and every reading it has recorded? Telemetry history is deleted with the device and cannot be recovered.`
          : ''}
        confirmLabel="Remove device"
        loading={deleting}
      />
    </div>
  );
}
