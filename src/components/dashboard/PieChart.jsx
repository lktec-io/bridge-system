import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiArrowRight } from 'react-icons/fi';

const R  = 60;
const SW = 18;
const CX = 80;
const CY = 80;
const C  = 2 * Math.PI * R;

/* Same colour semantics as the GIS pins so one condition reads identically
   everywhere in the system. */
const SLICES = [
  { key: 'GOOD',        color: '#16A34A', label: 'Good',        filter: 'GOOD'  },
  { key: 'FAIR',        color: '#EAB308', label: 'Fair',        filter: 'FAIR'  },
  { key: 'POOR',        color: '#DC2626', label: 'Poor',        filter: 'POOR'  },
  { key: 'UNINSPECTED', color: '#94A3B8', label: 'Uninspected', filter: 'never' },
];

export default function PieChart({ counts = {}, total = 0 }) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShown(true), 90);
    return () => clearTimeout(t);
  }, []);

  /* Built with a reduce so nothing is mutated during render — each slice's
     dash offset depends on the cumulative length of the slices before it. */
  const segments = SLICES.reduce((acc, s) => {
    const count  = counts[s.key] ?? 0;
    const pct    = total > 0 ? count / total : 0;
    const len    = pct * C;
    const cumLen = acc.reduce((sum, seg) => sum + seg.len, 0);
    acc.push({ ...s, count, pct, len, displayLen: shown ? len : 0, offset: C / 4 - cumLen });
    return acc;
  }, []);

  return (
    <div className="tile">
      <div className="card-header">
        <div>
          <div className="card-title">Condition Distribution</div>
          <div className="card-subtitle">Latest rating per structure</div>
        </div>
        <span className="ops-count">{total}</span>
      </div>

      <div className="card-body">
        <div className="pie-layout">

          <div className="pie-svg-wrap">
            <svg viewBox="0 0 160 160" width="140" height="140" role="img" aria-label="Condition distribution">
              <circle cx={CX} cy={CY} r={R} fill="none" stroke="var(--bg-inset)" strokeWidth={SW} />
              {total > 0 && segments.map((seg) =>
                seg.pct > 0 && (
                  <circle
                    key={seg.key}
                    cx={CX} cy={CY} r={R}
                    fill="none"
                    stroke={seg.color}
                    strokeWidth={SW}
                    strokeDasharray={`${seg.displayLen} ${C}`}
                    strokeDashoffset={seg.offset}
                    style={{ transition: 'stroke-dasharray .6s cubic-bezier(.4,0,.2,1)' }}
                  />
                )
              )}
            </svg>
            <div className="pie-pct">
              <span style={{
                fontSize: 'var(--fs-xl)', fontWeight: 700,
                color: 'var(--text-strong)', letterSpacing: '-.03em', lineHeight: 1,
              }}>
                {total}
              </span>
              <span className="label-tech" style={{ fontSize: 9 }}>Structures</span>
            </div>
          </div>

          <div className="pie-legend">
            {segments.map((seg) => (
              <Link key={seg.key} to={`/bridges?condition=${seg.filter}`} className="pie-legend-row">
                <span className="pie-dot" style={{ background: seg.color }} />
                <span className="pie-label">{seg.label}</span>
                <span className="pie-count">{seg.count}</span>
                <span className="muted mono" style={{ fontSize: 'var(--fs-micro)', minWidth: 32, textAlign: 'right' }}>
                  {Math.round(seg.pct * 100)}%
                </span>
                <FiArrowRight size={10} style={{ color: 'var(--text-light)', flexShrink: 0 }} />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
