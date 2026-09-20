import { FiTrendingUp, FiTrendingDown, FiMinus } from 'react-icons/fi';

/**
 * Section A structural KPI block.
 *
 * tone: 'neutral' | 'accent' | 'good' | 'fair' | 'critical'
 * meter: 0–100 → renders a 10-segment measurement bar
 * split: [{ value, tone }] → renders a proportional condition bar
 */
export default function KpiBlock({
  label, value, unit, icon: Icon, tone = 'neutral',
  delta, deltaLabel, note, meter, meterTone, split, total,
}) {
  const hasDelta = delta !== undefined && delta !== null && Number.isFinite(Number(delta));
  const dir = !hasDelta ? 'flat' : Number(delta) > 0 ? 'up' : Number(delta) < 0 ? 'down' : 'flat';
  const DeltaIcon = dir === 'up' ? FiTrendingUp : dir === 'down' ? FiTrendingDown : FiMinus;

  const segments = meter === null || meter === undefined
    ? null
    : Array.from({ length: 10 }, (_, i) => i * 10 < Math.round(Number(meter)));

  return (
    <div className={`kpi-block${tone === 'neutral' ? '' : ` is-${tone}`}`}>

      <div className="kpi-head">
        <span className="kpi-label">{label}</span>
        {Icon && (
          <span className="kpi-icon" aria-hidden="true">
            <Icon size={14} />
          </span>
        )}
      </div>

      <div className="kpi-value">
        <span>{value ?? '—'}</span>
        {unit && <span className="kpi-unit">{unit}</span>}
      </div>

      {segments && (
        <div className="kpi-meter" role="img" aria-label={`${value}${unit ?? ''}`}>
          {segments.map((on, i) => (
            <span key={i} className={`kpi-meter-seg${on ? ` on ${meterTone ?? ''}` : ''}`} />
          ))}
        </div>
      )}

      {split && total > 0 && (
        <div className="kpi-split" role="img" aria-label="Condition distribution">
          {split.filter((s) => s.value > 0).map((s) => (
            <span
              key={s.tone}
              className={`kpi-split-part ${s.tone}`}
              style={{ width: `${(s.value / total) * 100}%` }}
              title={`${s.label}: ${s.value}`}
            />
          ))}
        </div>
      )}

      <div className="kpi-foot">
        <span>{note}</span>
        {hasDelta && (
          <span className={`kpi-delta ${dir}`}>
            <DeltaIcon size={11} />
            {dir === 'up' ? '+' : ''}{delta} {deltaLabel}
          </span>
        )}
      </div>
    </div>
  );
}
