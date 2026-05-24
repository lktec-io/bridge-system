import { FiTrendingUp, FiTrendingDown } from 'react-icons/fi';

export default function StatsCard({ icon: Icon, value, label, color = 'blue', trend }) {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${color}`}>
        <Icon />
      </div>
      <div className="stat-body">
        <div className="stat-value">{value ?? '—'}</div>
        <div className="stat-label">{label}</div>
        {trend != null && (
          <div className="stat-trend" style={{
            color: trend > 0 ? 'var(--success)' : trend < 0 ? 'var(--danger)' : 'var(--text-muted)',
          }}>
            {trend > 0
              ? <FiTrendingUp size={11} />
              : trend < 0
              ? <FiTrendingDown size={11} />
              : null}
            {trend !== 0 ? Math.abs(trend) : '—'} this month
          </div>
        )}
      </div>
    </div>
  );
}
