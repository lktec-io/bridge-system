import { Link } from 'react-router-dom';
import { MdArrowForward } from 'react-icons/md';

const BARS = [
  { key: 'GOOD',        label: 'Good',          color: 'var(--success)', filterVal: 'GOOD' },
  { key: 'FAIR',        label: 'Fair',          color: 'var(--warning)', filterVal: 'FAIR' },
  { key: 'POOR',        label: 'Poor',          color: 'var(--danger)',  filterVal: 'POOR' },
  { key: 'UNINSPECTED', label: 'Not Inspected', color: 'var(--text-light)', filterVal: 'never' },
];

export default function ConditionChart({ counts = {}, total = 0 }) {
  const pct = (n) => total > 0 ? Math.round((n / total) * 100) : 0;

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">Condition Breakdown</div>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{total} bridge(s)</span>
      </div>
      <div className="card-body">
        {BARS.map(({ key, label, color, filterVal }) => {
          const count = counts[key] ?? 0;
          const p = pct(count);
          return (
            <div key={key} style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 600, marginBottom: 5 }}>
                <span style={{ color: 'var(--text)' }}>{label}</span>
                <span style={{ color: 'var(--text-muted)' }}>{count} ({p}%)</span>
              </div>
              <div style={{ height: 8, background: '#f1f5f9', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ width: `${p}%`, height: '100%', background: color, borderRadius: 99, transition: 'width .5s ease' }} />
              </div>
            </div>
          );
        })}
        <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
          <Link to="/bridges" className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'center' }}>
            View All Bridges <MdArrowForward />
          </Link>
        </div>
      </div>
    </div>
  );
}
