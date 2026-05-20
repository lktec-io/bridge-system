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
          <div style={{
            fontSize: 11, marginTop: 4, fontWeight: 600,
            color: trend > 0 ? 'var(--success)' : trend < 0 ? 'var(--danger)' : 'var(--text-muted)',
          }}>
            {trend > 0 ? `↑ ${trend}` : trend < 0 ? `↓ ${Math.abs(trend)}` : '—'} this month
          </div>
        )}
      </div>
    </div>
  );
}
