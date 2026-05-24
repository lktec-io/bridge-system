import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiArrowRight } from 'react-icons/fi';

const R   = 62;
const SW  = 22;
const CX  = 85;
const CY  = 85;
const C   = 2 * Math.PI * R;

const SLICES = [
  { key: 'GOOD',        color: '#10b981', label: 'Good',        filter: 'GOOD'  },
  { key: 'FAIR',        color: '#f59e0b', label: 'Fair',        filter: 'FAIR'  },
  { key: 'POOR',        color: '#ef4444', label: 'Poor',        filter: 'POOR'  },
  { key: 'UNINSPECTED', color: '#64748b', label: 'Uninspected', filter: 'never' },
];

export default function PieChart({ counts = {}, total = 0 }) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShown(true), 120);
    return () => clearTimeout(t);
  }, []);

  let cumLen = 0;
  const segments = SLICES.map((s) => {
    const count = counts[s.key] ?? 0;
    const pct   = total > 0 ? count / total : 0;
    const len   = pct * C;
    const offset = C / 4 - cumLen;
    cumLen += len;
    return { ...s, count, pct, displayLen: shown ? len : 0, offset };
  });

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">Condition Distribution</div>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{total} bridge(s)</span>
      </div>
      <div className="card-body">
        <div className="pie-layout">

          {/* SVG donut */}
          <div className="pie-svg-wrap">
            <svg viewBox="0 0 170 170" width="150" height="150">
              {/* Track */}
              <circle cx={CX} cy={CY} r={R} fill="none"
                stroke="var(--border)" strokeWidth={SW} />

              {total === 0 ? null : segments.map((seg) =>
                seg.pct > 0 && (
                  <circle
                    key={seg.key}
                    cx={CX} cy={CY} r={R}
                    fill="none"
                    stroke={seg.color}
                    strokeWidth={SW - 2}
                    strokeDasharray={`${seg.displayLen} ${C}`}
                    strokeDashoffset={seg.offset}
                    style={{ transition: 'stroke-dasharray 0.9s cubic-bezier(0.4,0,0.2,1)' }}
                  />
                )
              )}

              {/* Centre label */}
              <text x={CX} y={CY - 6}
                textAnchor="middle" dominantBaseline="auto"
                fill="var(--text)" fontSize="26" fontWeight="800"
                fontFamily="Poppins, sans-serif">
                {total}
              </text>
              <text x={CX} y={CY + 16}
                textAnchor="middle" dominantBaseline="auto"
                fill="var(--text-muted)" fontSize="10" fontWeight="600"
                letterSpacing="1" fontFamily="Poppins, sans-serif">
                TOTAL
              </text>
            </svg>
          </div>

          {/* Legend */}
          <div className="pie-legend">
            {segments.map((seg) => (
              <Link
                key={seg.key}
                to={`/bridges?condition=${seg.filter}`}
                className="pie-legend-row"
              >
                <span className="pie-dot" style={{ background: seg.color }} />
                <span className="pie-label">{seg.label}</span>
                <strong className="pie-count">{seg.count}</strong>
                <span className="pie-pct">{Math.round(seg.pct * 100)}%</span>
                <FiArrowRight size={10} style={{ color: 'var(--text-light)', marginLeft: 'auto', flexShrink: 0 }} />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
