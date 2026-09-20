import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FiAlertTriangle, FiAlertOctagon, FiClock, FiCpu, FiTool,
  FiRefreshCw, FiCheckCircle, FiChevronRight,
} from 'react-icons/fi';
import { bridgesAPI, inspectionsAPI } from '../api/bridges';
import { sensorsAPI } from '../api/sensors';
import { maintenanceAPI } from '../api/maintenance';
import { useAuth } from '../context/AuthContext';
import KpiBlock from '../components/dashboard/KpiBlock';
import { ConditionBadge } from '../components/ui/Badge';
import { fmtDate, fmtDateTime } from '../utils/format';

const OVERDUE_MONTHS = 6;   // matches the backend reminder job
const OVERDUE_MS = OVERDUE_MONTHS * 30 * 24 * 60 * 60 * 1000;

const conditionOf = (b) => b.inspections?.[0]?.conditionStatus ?? 'UNINSPECTED';

export default function HealthAlerts() {
  const { user } = useAuth();

  const [bridges, setBridges]         = useState([]);
  const [inspections, setInspections] = useState([]);
  const [devices, setDevices]         = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  const [unavailable, setUnavailable] = useState([]);
  const [loading, setLoading]         = useState(true);
  /* Evaluation time is captured when data loads, not read during render —
     a clock read inside render/useMemo is impure and never recomputes anyway. */
  const [evaluatedAt, setEvaluatedAt] = useState(() => Date.now());
  const [busyId, setBusyId]           = useState(null);
  const [error, setError]             = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const missing = [];

    const [brRes, insRes, devRes, mntRes] = await Promise.allSettled([
      bridgesAPI.getAll(),
      inspectionsAPI.getAll({ resolved: 'false' }),
      sensorsAPI.getDevices({ status: 'ALARM' }),
      maintenanceAPI.getAll({ type: 'EMERGENCY' }),
    ]);

    if (brRes.status === 'fulfilled') {
      const d = brRes.value.data;
      setBridges(Array.isArray(d) ? d : (d.bridges ?? []));
    } else setError('Unable to load structure records');

    if (insRes.status === 'fulfilled') setInspections(insRes.value.data);
    else missing.push('inspections');

    if (devRes.status === 'fulfilled') setDevices(devRes.value.data);
    else missing.push('sensor telemetry');

    if (mntRes.status === 'fulfilled') setMaintenance(mntRes.value.data);
    else missing.push('maintenance');

    setUnavailable(missing);
    setEvaluatedAt(Date.now());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const signals = useMemo(() => {
    const critical = bridges.filter((b) => conditionOf(b) === 'POOR');

    const overdue = bridges.filter((b) => {
      const last = b.inspections?.[0]?.inspectionDate;
      if (!last) return true;
      return evaluatedAt - new Date(last).getTime() > OVERDUE_MS;
    });

    const defects = inspections.filter((i) => i.defectDescription && !i.isResolved);

    const alarms = devices.filter((d) => d.latest?.status === 'ALARM');

    const emergency = maintenance.filter(
      (m) => m.status === 'PLANNED' || m.status === 'IN_PROGRESS'
    );

    return { critical, overdue, defects, alarms, emergency };
  }, [bridges, inspections, devices, maintenance, evaluatedAt]);

  const approve = async (ins) => {
    setBusyId(ins.id);
    try {
      await inspectionsAPI.resolve(ins.id, `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim());
      setInspections((prev) => prev.filter((i) => i.id !== ins.id));
    } catch (err) {
      setError(err.response?.data?.message || 'Could not sign off this defect');
    } finally {
      setBusyId(null);
    }
  };

  const total =
    signals.critical.length + signals.overdue.length +
    signals.alarms.length + signals.emergency.length;

  if (loading) {
    return <div className="loading-center"><div className="spinner" /><span>Collecting health signals…</span></div>;
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Structural Health Alerts</h2>
          <p>{total} active signal(s) across condition, schedule, telemetry and works</p>
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

      {unavailable.length > 0 && (
        <div className="alert alert-warning" style={{ marginBottom: 'var(--sp-4)' }}>
          <FiAlertTriangle size={15} />
          <span>
            Not all sources responded — {unavailable.join(', ')} unavailable. Counts below
            exclude those sources rather than guessing.
          </span>
        </div>
      )}

      <div className="kpi-grid">
        <KpiBlock
          label="Critical Condition" icon={FiAlertOctagon}
          tone={signals.critical.length > 0 ? 'critical' : 'good'}
          value={signals.critical.length}
          note="Latest inspection rated POOR" />
        <KpiBlock
          label="Overdue Inspections" icon={FiClock}
          tone={signals.overdue.length > 0 ? 'fair' : 'good'}
          value={signals.overdue.length}
          note={`Older than ${OVERDUE_MONTHS} months, or never inspected`} />
        <KpiBlock
          label="Sensor Alarms" icon={FiCpu}
          tone={signals.alarms.length > 0 ? 'critical' : 'good'}
          value={signals.alarms.length}
          note="Devices above alarm threshold" />
        <KpiBlock
          label="Emergency Works Open" icon={FiTool}
          tone={signals.emergency.length > 0 ? 'critical' : 'good'}
          value={signals.emergency.length}
          note="Emergency orders not yet completed" />
      </div>

      {total === 0 && signals.defects.length === 0 && (
        <div className="tile">
          <div className="empty-state">
            <FiCheckCircle style={{ color: 'var(--good)', opacity: .8 }} />
            <h3>No active structural health signals</h3>
            <p>
              Every structure has a current inspection, no telemetry is breaching thresholds,
              and no emergency works are outstanding.
            </p>
          </div>
        </div>
      )}

      {/* ── Critical condition ─────────────────────────── */}
      {signals.critical.length > 0 && (
        <section className="ops-panel">
          <div className="ops-head">
            <span className="ops-title">
              <FiAlertOctagon size={14} style={{ color: 'var(--poor)' }} />
              Critical Structural Condition
              <span className="ops-count">{signals.critical.length}</span>
            </span>
          </div>
          <div className="ops-scroll">
            <table className="table ops-table">
              <thead>
                <tr>
                  <th>Structure</th><th>Location</th><th>Type</th>
                  <th>Last Inspection</th><th>Defect</th><th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {signals.critical.map((b) => {
                  const ins = b.inspections?.[0];
                  return (
                    <tr key={b.id} className="row-poor">
                      <td><Link to={`/bridges/${b.id}`} className="serial-link">{b.serialNumber}</Link></td>
                      <td className="muted">{b.section}</td>
                      <td className="muted">{b.structureType}</td>
                      <td className="mono" style={{ fontSize: 'var(--fs-xs)' }}>{fmtDate(ins?.inspectionDate)}</td>
                      <td className="wrap-cell muted">
                        {ins?.defectDescription
                          ? ins.defectDescription.slice(0, 110) + (ins.defectDescription.length > 110 ? '…' : '')
                          : '—'}
                      </td>
                      <td>
                        <div className="ops-actions no-print">
                          <Link to={`/bridges/${b.id}/inspections/new`} className="btn btn-primary btn-sm">
                            Inspect
                          </Link>
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

      {/* ── Open defects awaiting sign-off ─────────────── */}
      {signals.defects.length > 0 && (
        <section className="ops-panel">
          <div className="ops-head">
            <span className="ops-title">
              <FiAlertTriangle size={14} style={{ color: 'var(--fair)' }} />
              Defects Awaiting Sign-Off
              <span className="ops-count">{signals.defects.length}</span>
            </span>
            <Link to="/inspections" className="btn btn-ghost btn-sm no-print">Inspection log</Link>
          </div>
          <div className="ops-scroll">
            <table className="table ops-table">
              <thead>
                <tr>
                  <th>Structure</th><th>Inspected</th><th>Inspector</th>
                  <th>Rating</th><th>Defect</th><th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {signals.defects.map((i) => (
                  <tr key={i.id}>
                    <td><Link to={`/bridges/${i.bridgeId}`} className="serial-link">{i.bridge?.serialNumber ?? `#${i.bridgeId}`}</Link></td>
                    <td className="mono" style={{ fontSize: 'var(--fs-xs)' }}>{fmtDate(i.inspectionDate)}</td>
                    <td className="muted">{i.inspectorName}</td>
                    <td><ConditionBadge status={i.conditionStatus} /></td>
                    <td className="wrap-cell muted">
                      {i.defectDescription.slice(0, 110)}{i.defectDescription.length > 110 ? '…' : ''}
                    </td>
                    <td>
                      <div className="ops-actions no-print">
                        <button
                          className="btn btn-outline-success btn-sm"
                          onClick={() => approve(i)}
                          disabled={busyId === i.id}
                        >
                          {busyId === i.id ? <span className="spinner spinner-sm" /> : <FiCheckCircle size={12} />}
                          Approve
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ── Sensor alarms ──────────────────────────────── */}
      {signals.alarms.length > 0 && (
        <section className="ops-panel">
          <div className="ops-head">
            <span className="ops-title">
              <FiCpu size={14} style={{ color: 'var(--poor)' }} />
              Telemetry Threshold Breaches
              <span className="ops-count">{signals.alarms.length}</span>
            </span>
            <Link to="/sensors" className="btn btn-ghost btn-sm no-print">
              Analytics <FiChevronRight size={12} />
            </Link>
          </div>
          <div className="ops-scroll">
            <table className="table ops-table">
              <thead>
                <tr>
                  <th>Device</th><th>Structure</th><th>Type</th>
                  <th className="num">Reading</th><th className="num">Alarm at</th><th>Recorded</th>
                </tr>
              </thead>
              <tbody>
                {signals.alarms.map((d) => (
                  <tr key={d.id} className="row-poor">
                    <td className="mono" style={{ fontSize: 'var(--fs-xs)', fontWeight: 700 }}>{d.deviceCode}</td>
                    <td><Link to={`/bridges/${d.bridgeId}`} className="serial-link">{d.bridge?.serialNumber ?? `#${d.bridgeId}`}</Link></td>
                    <td className="muted">{d.sensorType.replace('_', ' ')}</td>
                    <td className="num">{d.latest?.value}{d.unit ? ` ${d.unit}` : ''}</td>
                    <td className="num muted">{d.alarmThreshold ?? '—'}</td>
                    <td className="mono" style={{ fontSize: 'var(--fs-xs)' }}>{fmtDateTime(d.latest?.recordedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ── Emergency works ───────────────────────────── */}
      {signals.emergency.length > 0 && (
        <section className="ops-panel">
          <div className="ops-head">
            <span className="ops-title">
              <FiTool size={14} style={{ color: 'var(--accent-darker)' }} />
              Emergency Works Outstanding
              <span className="ops-count">{signals.emergency.length}</span>
            </span>
            <Link to="/maintenance" className="btn btn-ghost btn-sm no-print">
              Schedules <FiChevronRight size={12} />
            </Link>
          </div>
          <div className="ops-scroll">
            <table className="table ops-table">
              <thead>
                <tr><th>Structure</th><th>Scope</th><th>Scheduled</th><th>Performed By</th><th>Status</th></tr>
              </thead>
              <tbody>
                {signals.emergency.map((m) => (
                  <tr key={m.id} className="row-critical">
                    <td><Link to={`/bridges/${m.bridgeId}`} className="serial-link">{m.bridge?.serialNumber ?? `#${m.bridgeId}`}</Link></td>
                    <td className="wrap-cell muted">{m.description.slice(0, 110)}{m.description.length > 110 ? '…' : ''}</td>
                    <td className="mono" style={{ fontSize: 'var(--fs-xs)' }}>{fmtDate(m.maintenanceDate)}</td>
                    <td className="muted">{m.performedBy}</td>
                    <td><span className={`status-pill ${m.status.toLowerCase()}`}>{m.status.replace('_', ' ')}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ── Overdue inspections ───────────────────────── */}
      {signals.overdue.length > 0 && (
        <section className="ops-panel">
          <div className="ops-head">
            <span className="ops-title">
              <FiClock size={14} style={{ color: 'var(--fair)' }} />
              Inspection Overdue
              <span className="ops-count">{signals.overdue.length}</span>
            </span>
          </div>
          <div className="ops-scroll">
            <table className="table ops-table">
              <thead>
                <tr>
                  <th>Structure</th><th>Location</th><th>Last Inspection</th>
                  <th>Current Rating</th><th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {signals.overdue.map((b) => {
                  const last = b.inspections?.[0]?.inspectionDate;
                  return (
                    <tr key={b.id}>
                      <td><Link to={`/bridges/${b.id}`} className="serial-link">{b.serialNumber}</Link></td>
                      <td className="muted">{b.section}</td>
                      <td className="mono" style={{ fontSize: 'var(--fs-xs)' }}>
                        {last ? fmtDate(last) : <span style={{ color: 'var(--fair)' }}>never</span>}
                      </td>
                      <td><ConditionBadge status={b.inspections?.[0]?.conditionStatus} /></td>
                      <td>
                        <div className="ops-actions no-print">
                          <Link to={`/bridges/${b.id}/inspections/new`} className="btn btn-primary btn-sm">
                            Schedule inspection
                          </Link>
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
    </div>
  );
}
