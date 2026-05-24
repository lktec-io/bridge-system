import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { bridgesAPI } from '../api/bridges';
import { format } from 'date-fns';
import {
  FiLayers, FiActivity, FiCheckCircle, FiAlertCircle,
  FiAlertTriangle, FiAlertOctagon, FiArrowRight, FiRefreshCw, FiPlus,
} from 'react-icons/fi';
import { MdWarning, MdReportProblem } from 'react-icons/md';
import { useAuth } from '../context/AuthContext';
import StatsCard      from '../components/dashboard/StatsCard';
import PieChart       from '../components/dashboard/PieChart';
import RecentActivity from '../components/dashboard/RecentActivity';
import { ConditionBadge } from '../components/ui/Badge';

const safeDate = (d, fmt) => {
  if (!d) return '—';
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? '—' : format(dt, fmt);
};

function getGreeting(role) {
  const h = new Date().getHours();
  const part = h < 12 ? 'Good Morning' : h < 17 ? 'Good Afternoon' : 'Good Evening';
  const labels = { ADMIN: 'Administrator', ENGINEER: 'Engineer', INSPECTOR: 'Inspector' };
  const label = labels[role] ?? 'User';
  return `${part}, ${label}`;
}

function getLiveDateStr() {
  const now = new Date();
  return now.toLocaleDateString('en-US', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

// ── Trend bar chart ───────────────────────────────────────────
function TrendChart({ data }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div className="trend-chart">
      {data.map(({ month, count }) => (
        <div key={month} className="trend-col">
          <div className="trend-bar-wrap">
            <div
              className="trend-bar-inner"
              style={{ height: `${Math.round((count / max) * 100)}%` }}
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

// ── Dashboard ─────────────────────────────────────────────────
export default function Dashboard() {
  const { user } = useAuth();
  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  const fetchStats = async () => {
    setLoading(true); setError('');
    try {
      const { data } = await bridgesAPI.getDashboard();
      setStats(data);
    } catch { setError('Failed to load dashboard data'); }
    finally  { setLoading(false); }
  };

  useEffect(() => { fetchStats(); }, []);

  if (loading) return (
    <div className="loading-center">
      <div className="spinner" />
      <span>Loading dashboard…</span>
    </div>
  );

  if (error) return (
    <div className="empty-state">
      <FiAlertOctagon style={{ fontSize: 48, opacity: .4 }} />
      <h3>Dashboard unavailable</h3>
      <p>{error}</p>
      <button className="btn btn-primary btn-sm" onClick={fetchStats}>
        <FiRefreshCw size={14} /> Retry
      </button>
    </div>
  );

  const {
    totalBridges, recentlyInspected, unresolvedDefects,
    conditionCounts, recentActivity, inspectionTrend, poorBridges, recentInspections,
  } = stats;

  return (
    <div>

      {/* ── Welcome hero ────────────────────────────────── */}
      <div className="welcome-hero">
        <div className="welcome-glow wg1" aria-hidden="true" />
        <div className="welcome-glow wg2" aria-hidden="true" />
        <div className="welcome-hero-body">
          <div className="welcome-eyebrow">
            <span className="welcome-greeting-chip">{getGreeting(user?.role)}</span>
            <span className="welcome-date-chip">{getLiveDateStr()}</span>
          </div>
          <h2 className="welcome-title">
            Welcome Back, <span className="welcome-name">{user?.firstName}</span>
          </h2>
          <p className="welcome-subtitle">
            Bridge network status — {totalBridges ?? '…'} infrastructure assets monitored
          </p>
        </div>
        <button className="btn btn-ghost btn-sm welcome-refresh-btn" onClick={fetchStats}>
          <FiRefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* ── Urgency banner ──────────────────────────────── */}
      {(conditionCounts.POOR ?? 0) > 0 && (
        <div className="urgency-banner no-print">
          <div className="urgency-banner-icon">
            <MdReportProblem size={26} color="var(--danger)" />
          </div>
          <div style={{ flex: 1 }}>
            <h4>{conditionCounts.POOR} bridge(s) in POOR condition require urgent attention</h4>
            <p>{unresolvedDefects} unresolved defect record(s) across all bridges.</p>
          </div>
          <Link to="/bridges?condition=POOR" className="btn btn-danger btn-sm no-print" style={{ flexShrink: 0 }}>
            View Now <FiArrowRight size={13} />
          </Link>
        </div>
      )}

      {/* ── 6 stat cards ────────────────────────────────── */}
      <div className="stats-grid-6">
        <StatsCard icon={FiLayers}       value={totalBridges}              label="Total Bridges"       color="blue"   />
        <StatsCard icon={FiActivity}     value={recentlyInspected}         label="Inspected (30 days)" color="teal"   />
        <StatsCard icon={FiCheckCircle}  value={conditionCounts.GOOD ?? 0} label="Good Condition"      color="green"  />
        <StatsCard icon={FiAlertCircle}  value={conditionCounts.FAIR ?? 0} label="Fair Condition"      color="amber"  />
        <StatsCard icon={FiAlertTriangle}value={conditionCounts.POOR ?? 0} label="Poor Condition"      color="red"    />
        <StatsCard icon={FiAlertOctagon} value={unresolvedDefects}         label="Unresolved Defects"  color="orange" />
      </div>

      {/* ── Middle row ──────────────────────────────────── */}
      <div className="dashboard-panels">

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <PieChart counts={conditionCounts} total={totalBridges} />

          <div className="card">
            <div className="card-header">
              <div className="card-title">Inspection Trend</div>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Last 6 months</span>
            </div>
            <div className="card-body">
              <TrendChart data={inspectionTrend} />
            </div>
          </div>
        </div>

        <RecentActivity logs={recentActivity} />
      </div>

      {/* ── Recent inspections ──────────────────────────── */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <div>
            <div className="card-title">Latest Inspections</div>
            <div className="card-subtitle">Most recently recorded inspection activities</div>
          </div>
          <Link to="/inspections" className="btn btn-ghost btn-sm no-print">
            All Inspections <FiArrowRight size={13} />
          </Link>
        </div>
        {recentInspections.length === 0 ? (
          <div className="empty-state" style={{ padding: '40px 24px' }}>
            <p>No inspections recorded yet.</p>
            <Link to="/bridges" className="btn btn-primary btn-sm">
              <FiPlus size={14} /> Start Inspecting
            </Link>
          </div>
        ) : (
          <div className="table-compact">
            <table className="table">
              <thead>
                <tr>
                  <th>Bridge</th>
                  <th>Section</th>
                  <th>Inspector</th>
                  <th>Date</th>
                  <th>Condition</th>
                  <th style={{ textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {recentInspections.map((ins) => (
                  <tr key={ins.id} className={ins.conditionStatus === 'POOR' ? 'row-poor' : ''}>
                    <td>
                      <Link to={`/bridges/${ins.bridgeId}`} style={{ color: 'var(--primary)', fontWeight: 700 }}>
                        {ins.bridge?.serialNumber}
                      </Link>
                    </td>
                    <td className="muted">{ins.bridge?.section}</td>
                    <td>{ins.inspectorName}</td>
                    <td className="muted">{safeDate(ins.inspectionDate, 'dd MMM yyyy')}</td>
                    <td><ConditionBadge status={ins.conditionStatus} /></td>
                    <td style={{ textAlign: 'center' }}>
                      <Link to={`/bridges/${ins.bridgeId}`} className="btn btn-ghost btn-sm no-print">View</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Poor bridges ────────────────────────────────── */}
      {poorBridges.length > 0 && (
        <div className="card">
          <div className="card-header" style={{ background: 'var(--danger-light)' }}>
            <div>
              <div className="card-title" style={{ color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <MdWarning size={18} /> Bridges Requiring Urgent Attention
              </div>
              <div className="card-subtitle">
                Latest inspection status: POOR — immediate maintenance required
              </div>
            </div>
            <Link to="/bridges?condition=POOR" className="btn btn-danger btn-sm no-print">
              View All <FiArrowRight size={13} />
            </Link>
          </div>
          <div className="table-compact">
            <table className="table">
              <thead>
                <tr>
                  <th>Serial No.</th>
                  <th>Section</th>
                  <th>Last Inspected</th>
                  <th>Inspector</th>
                  <th>Defect Summary</th>
                  <th style={{ textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {poorBridges.map((b) => {
                  const ins = b.inspections[0];
                  return (
                    <tr key={b.id} className="row-poor">
                      <td>
                        <Link to={`/bridges/${b.id}`} style={{ color: 'var(--danger)', fontWeight: 700 }}>
                          {b.serialNumber}
                        </Link>
                      </td>
                      <td>{b.section}</td>
                      <td className="muted">
                        {ins ? safeDate(ins.inspectionDate, 'dd MMM yyyy') : '—'}
                      </td>
                      <td>{ins?.inspectorName ?? '—'}</td>
                      <td style={{ fontSize: 12, maxWidth: 220, color: 'var(--text-muted)' }}>
                        {ins?.defectDescription
                          ? ins.defectDescription.length > 80
                            ? `${ins.defectDescription.slice(0, 80)}…`
                            : ins.defectDescription
                          : 'No description provided'
                        }
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <Link to={`/bridges/${b.id}/inspections/new`} className="btn btn-primary btn-sm no-print">
                          <FiPlus size={13} /> Inspect
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
