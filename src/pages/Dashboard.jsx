import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { bridgesAPI } from '../api/bridges';
import { format } from 'date-fns';
import {
  MdAccountBalance, MdWarning, MdError, MdCheckCircle,
  MdArrowForward, MdRefresh, MdAdd, MdFiberManualRecord,
} from 'react-icons/md';
import StatsCard       from '../components/dashboard/StatsCard';
import ConditionChart  from '../components/dashboard/ConditionChart';
import RecentActivity  from '../components/dashboard/RecentActivity';
import { ConditionBadge } from '../components/ui/Badge';

// ── Trend bar chart ───────────────────────────────────────
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

// ── Dashboard ─────────────────────────────────────────────
export default function Dashboard() {
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

  if (loading) return <div className="loading-center"><div className="spinner" /><span>Loading dashboard...</span></div>;
  if (error)   return (
    <div className="empty-state">
      <MdError />
      <h3>Dashboard unavailable</h3>
      <p>{error}</p>
      <button className="btn btn-primary btn-sm" onClick={fetchStats}><MdRefresh /> Retry</button>
    </div>
  );

  const {
    totalBridges, recentlyInspected, unresolvedDefects,
    conditionCounts, recentActivity, inspectionTrend, poorBridges, recentInspections,
  } = stats;

  return (
    <div>

      {/* ── Urgency banner ─────────────────────────────── */}
      {(conditionCounts.POOR ?? 0) > 0 && (
        <div className="urgency-banner no-print">
          <div className="urgency-banner-icon">🚨</div>
          <div style={{ flex: 1 }}>
            <h4>{conditionCounts.POOR} bridge(s) in POOR condition require urgent attention</h4>
            <p>{unresolvedDefects} unresolved defect record(s) across all bridges.</p>
          </div>
          <Link to="/bridges?condition=POOR" className="btn btn-danger btn-sm" style={{ flexShrink: 0 }}>
            View Now <MdArrowForward />
          </Link>
        </div>
      )}

      {/* ── 6 stat cards ───────────────────────────────── */}
      <div className="stats-grid-6">
        <StatsCard icon={MdAccountBalance}    value={totalBridges}              label="Total Bridges"       color="blue"   />
        <StatsCard icon={MdCheckCircle}       value={recentlyInspected}         label="Inspected (30 days)" color="teal"   />
        <StatsCard icon={MdFiberManualRecord} value={conditionCounts.GOOD ?? 0} label="Good Condition"      color="green"  />
        <StatsCard icon={MdWarning}           value={conditionCounts.FAIR ?? 0} label="Fair Condition"      color="amber"  />
        <StatsCard icon={MdError}             value={conditionCounts.POOR ?? 0} label="Poor Condition"      color="red"    />
        <StatsCard icon={MdWarning}           value={unresolvedDefects}         label="Unresolved Defects"  color="orange" />
      </div>

      {/* ── Middle row: left panel + activity ──────────── */}
      <div className="dashboard-panels">

        {/* Left: condition breakdown + trend */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <ConditionChart counts={conditionCounts} total={totalBridges} />

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

        {/* Right: activity feed */}
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
            All Inspections <MdArrowForward />
          </Link>
        </div>
        {recentInspections.length === 0 ? (
          <div className="empty-state" style={{ padding: '40px 24px' }}>
            <p>No inspections recorded yet.</p>
            <Link to="/bridges" className="btn btn-primary btn-sm"><MdAdd /> Start Inspecting</Link>
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
                    <td className="muted">{format(new Date(ins.inspectionDate), 'dd MMM yyyy')}</td>
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

      {/* ── Poor bridges urgent table ───────────────────── */}
      {poorBridges.length > 0 && (
        <div className="card">
          <div className="card-header" style={{ background: '#fff5f5' }}>
            <div>
              <div className="card-title" style={{ color: 'var(--danger)' }}>
                ⚠ Bridges Requiring Urgent Attention
              </div>
              <div className="card-subtitle">
                Latest inspection status: POOR — immediate maintenance required
              </div>
            </div>
            <Link to="/bridges?condition=POOR" className="btn btn-danger btn-sm no-print">
              View All <MdArrowForward />
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
                        {ins ? format(new Date(ins.inspectionDate), 'dd MMM yyyy') : '—'}
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
                          + Inspect
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
