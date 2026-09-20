import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FiDatabase, FiAlertTriangle, FiClipboard, FiActivity, FiRefreshCw,
  FiArrowRight, FiTool, FiCpu, FiAlertOctagon,
} from 'react-icons/fi';
import { bridgesAPI, inspectionsAPI } from '../api/bridges';
import { useAuth } from '../context/AuthContext';
import KpiBlock       from '../components/dashboard/KpiBlock';
import GisHub         from '../components/dashboard/GisHub';
import OpsTable       from '../components/dashboard/OpsTable';
import PieChart       from '../components/dashboard/PieChart';
import RecentActivity from '../components/dashboard/RecentActivity';
import ConfirmDialog  from '../components/ui/ConfirmDialog';
import { fmtDateTime } from '../utils/format';

/* Inspection throughput bars — last 6 months. */
function TrendChart({ data = [] }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div className="trend-chart">
      {data.map(({ month, count }) => (
        <div key={month} className="trend-col">
          <div className="trend-bar-wrap">
            <div
              className="trend-bar-inner"
              style={{ height: `${Math.max(Math.round((count / max) * 100), count > 0 ? 4 : 1)}%` }}
              title={`${count} inspection(s)`}
            />
          </div>
          <div className="trend-month">{month}</div>
          <div className="trend-count">{count}</div>
        </div>
      ))}
    </div>
  );
}

function healthTone(index) {
  if (index === null || index === undefined) return 'neutral';
  if (index >= 80) return 'good';
  if (index >= 55) return 'fair';
  return 'critical';
}

function DashboardSkeleton() {
  return (
    <div>
      <div className="skel" style={{ height: 66, marginBottom: 16 }} />
      <div className="kpi-grid">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="kpi-block">
            <div className="skel skel-text" style={{ width: '55%' }} />
            <div className="skel" style={{ height: 26, width: '40%' }} />
            <div className="skel skel-text" style={{ width: '70%', marginBottom: 0 }} />
          </div>
        ))}
      </div>
      <div className="gis-grid">
        <div className="tile"><div className="skel" style={{ height: 380 }} /></div>
        <div className="tile"><div className="skel" style={{ height: 380 }} /></div>
      </div>
      <div className="ops-panel"><div className="skel" style={{ height: 220 }} /></div>
    </div>
  );
}

export default function Dashboard() {
  const { user, isAdmin } = useAuth();

  const [stats,   setStats]   = useState(null);
  const [bridges, setBridges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [mapError, setMapError] = useState('');

  const [busyId,    setBusyId]    = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting,  setDeleting]  = useState(false);
  const [actionError, setActionError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    setMapError('');

    /* The two calls are independent: a failure to load positions must not
       blank the KPI strip, and vice versa. */
    const [statsRes, bridgeRes] = await Promise.allSettled([
      bridgesAPI.getDashboard(),
      bridgesAPI.getAll(),
    ]);

    if (statsRes.status === 'fulfilled') setStats(statsRes.value.data);
    else setError('Unable to load monitoring metrics');

    if (bridgeRes.status === 'fulfilled') {
      const data = bridgeRes.value.data;
      setBridges(Array.isArray(data) ? data : (data.bridges ?? []));
    } else {
      setMapError('Unable to load asset positions');
    }

    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Approve (resolve) an open defect ───────────────────────
  const approve = async (ins) => {
    setBusyId(ins.id);
    setActionError('');
    try {
      await inspectionsAPI.resolve(ins.id, `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim());
      setStats((prev) => prev && {
        ...prev,
        recentInspections: prev.recentInspections.map((r) =>
          r.id === ins.id ? { ...r, isResolved: true } : r
        ),
      });
      load();
    } catch (err) {
      setActionError(err.response?.data?.message || 'Could not approve this inspection');
    } finally {
      setBusyId(null);
    }
  };

  // ── Hard delete an inspection record ───────────────────────
  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    setActionError('');
    try {
      await inspectionsAPI.delete(pendingDelete.id);
      setStats((prev) => prev && {
        ...prev,
        recentInspections: prev.recentInspections.filter((r) => r.id !== pendingDelete.id),
      });
      setPendingDelete(null);
      load();
    } catch (err) {
      setActionError(err.response?.data?.message || 'Could not delete this inspection');
      setPendingDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  if (loading && !stats) return <DashboardSkeleton />;

  if (error && !stats) {
    return (
      <div className="empty-state">
        <FiAlertOctagon />
        <h3>Monitoring data unavailable</h3>
        <p>{error}</p>
        <button className="btn btn-primary btn-sm" onClick={load}>
          <FiRefreshCw size={13} /> Retry
        </button>
      </div>
    );
  }

  const {
    totalBridges = 0, conditionCounts = {}, healthIndex, coverage = {},
    quarter = {}, criticalAlerts = {}, inspectionTrend = [], recentActivity = [],
    recentInspections = [], maintenance = {}, sensors = {}, generatedAt,
  } = stats ?? {};

  return (
    <div>

      {/* ── Command strip ──────────────────────────────── */}
      <div className="command-strip">
        <div className="command-strip-left">
          <div className="command-strip-label">Bridge Management System</div>
          <div className="command-strip-title">Structural Command Overview</div>
          <div className="command-strip-meta">
            <span>OPERATOR: {user?.firstName} {user?.lastName}</span>
            <span className="sep">│</span>
            <span>ROLE: {user?.role}</span>
            <span className="sep">│</span>
            <span>SYNC: {generatedAt ? fmtDateTime(generatedAt) : '—'}</span>
          </div>
        </div>
        <div className="command-strip-right no-print">
          <button className="btn-strip" onClick={load} disabled={loading}>
            <FiRefreshCw size={12} /> {loading ? 'Syncing…' : 'Resync'}
          </button>
          <Link to="/bridges/new" className="btn btn-primary btn-sm">
            Register structure
          </Link>
        </div>
      </div>

      {actionError && (
        <div className="alert alert-error" style={{ marginBottom: 'var(--sp-4)' }}>
          <FiAlertOctagon size={15} />
          <span style={{ flex: 1 }}>{actionError}</span>
          <button className="btn-close" onClick={() => setActionError('')}>×</button>
        </div>
      )}

      {/* ── Critical banner ───────────────────────────── */}
      {criticalAlerts.total > 0 && (
        <div className="urgency-banner no-print">
          <div className="urgency-banner-icon">
            <FiAlertTriangle size={18} style={{ color: 'var(--accent-darker)' }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h4>{criticalAlerts.total} critical maintenance alert(s) require attention</h4>
            <p>
              {criticalAlerts.poorCondition} structure(s) rated POOR ·{' '}
              {criticalAlerts.overdueInspections} overdue inspection(s) ·{' '}
              {criticalAlerts.emergencyMaintenance} emergency work order(s) ·{' '}
              {criticalAlerts.sensorAlarms} sensor alarm(s)
            </p>
          </div>
          <Link to="/alerts" className="btn btn-primary btn-sm" style={{ flexShrink: 0 }}>
            Open alerts <FiArrowRight size={12} />
          </Link>
        </div>
      )}

      {/* ── SECTION A — top level metrics ─────────────── */}
      <div className="kpi-grid">
        <KpiBlock
          label="Total Monitored Bridges"
          value={totalBridges}
          icon={FiDatabase}
          note={`${coverage.inspected ?? 0} inspected · ${conditionCounts.UNINSPECTED ?? 0} pending`}
          total={totalBridges}
          split={[
            { tone: 'good', value: conditionCounts.GOOD ?? 0,        label: 'Good' },
            { tone: 'fair', value: conditionCounts.FAIR ?? 0,        label: 'Fair' },
            { tone: 'poor', value: conditionCounts.POOR ?? 0,        label: 'Poor' },
            { tone: 'none', value: conditionCounts.UNINSPECTED ?? 0, label: 'Uninspected' },
          ]}
        />

        <KpiBlock
          label="Critical Maintenance Alerts"
          value={criticalAlerts.total ?? 0}
          icon={FiAlertTriangle}
          tone={criticalAlerts.total > 0 ? 'critical' : 'good'}
          note={`${criticalAlerts.poorCondition ?? 0} poor · ${criticalAlerts.overdueInspections ?? 0} overdue`}
        />

        <KpiBlock
          label="Inspected This Quarter"
          value={quarter.inspections ?? 0}
          icon={FiClipboard}
          tone="accent"
          note={`${quarter.bridgesInspected ?? 0} distinct structure(s)`}
          delta={quarter.delta}
          deltaLabel="vs last quarter"
        />

        <KpiBlock
          label="Overall Structural Health Index"
          value={healthIndex ?? '—'}
          unit={healthIndex != null ? '%' : undefined}
          icon={FiActivity}
          tone={healthTone(healthIndex)}
          meter={healthIndex}
          meterTone={healthTone(healthIndex)}
          note={healthIndex != null
            ? `Weighted across ${coverage.pct ?? 0}% of portfolio`
            : 'No inspections recorded yet'}
        />
      </div>

      {/* ── SECTION B — GIS / digital twin hub ────────── */}
      <GisHub
        bridges={bridges}
        loading={loading}
        error={mapError}
        onRetry={load}
        healthIndex={healthIndex}
      />

      {/* ── SECTION C — data operations ───────────────── */}
      <OpsTable
        rows={recentInspections}
        isAdmin={isAdmin}
        onApprove={approve}
        onDelete={setPendingDelete}
        busyId={busyId}
      />

      {/* ── Supporting analytics ──────────────────────── */}
      <div className="dashboard-panels">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)', minWidth: 0 }}>
          <PieChart counts={conditionCounts} total={totalBridges} />

          <div className="tile">
            <div className="card-header">
              <div>
                <div className="card-title">Inspection Throughput</div>
                <div className="card-subtitle">Records filed per month, last 6 months</div>
              </div>
            </div>
            <div className="card-body">
              <TrendChart data={inspectionTrend} />
            </div>
          </div>

          {/* Module status — shows honestly when a module has no data yet */}
          <div className="tile">
            <div className="card-header">
              <span className="card-title">Module Status</span>
            </div>
            <div className="gis-stat-list">
              <div className="gis-stat-row">
                <span className="k"><FiTool size={12} /> Maintenance work orders open</span>
                <span className="v">{maintenance.available === false ? 'n/a' : (maintenance.open ?? 0)}</span>
              </div>
              <div className="gis-stat-row">
                <span className="k"><FiTool size={12} /> Emergency orders active</span>
                <span className="v">{maintenance.available === false ? 'n/a' : (maintenance.emergencyOpen ?? 0)}</span>
              </div>
              <div className="gis-stat-row">
                <span className="k"><FiCpu size={12} /> Sensor devices registered</span>
                <span className="v">{sensors.available === false ? 'n/a' : (sensors.deviceCount ?? 0)}</span>
              </div>
              <div className="gis-stat-row">
                <span className="k"><FiCpu size={12} /> Sensors in alarm</span>
                <span className="v">{sensors.available === false ? 'n/a' : (sensors.byStatus?.ALARM ?? 0)}</span>
              </div>
            </div>
            {(maintenance.available === false || sensors.available === false) && (
              <div className="card-body" style={{ paddingTop: 0 }}>
                <p className="muted" style={{ fontSize: 'var(--fs-xs)' }}>
                  A module reporting <span className="mono">n/a</span> has no database tables yet —
                  apply <span className="mono">server/database/migrations/</span> to enable it.
                </p>
              </div>
            )}
          </div>
        </div>

        <RecentActivity logs={recentActivity} />
      </div>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
        title="Hard delete inspection"
        message={
          pendingDelete
            ? `Permanently delete the ${pendingDelete.conditionStatus} inspection dated ${new Date(pendingDelete.inspectionDate).toLocaleDateString()} for ${pendingDelete.bridge?.serialNumber ?? 'this structure'}? This removes the record from the database and cannot be undone.`
            : ''
        }
        confirmLabel="Hard delete"
        loading={deleting}
      />
    </div>
  );
}
