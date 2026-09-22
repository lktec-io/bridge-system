import { Link } from 'react-router-dom';
import { FiEye, FiPlus, FiEdit2, FiTrash2, FiAlertTriangle } from 'react-icons/fi';
import { ConditionBadge } from '../ui/Badge';
import { fmtDate } from '../../utils/format';

const condClass = (s) => ({ GOOD: 'cond-good', FAIR: 'cond-fair', POOR: 'cond-poor' })[s] ?? 'cond-none';

export default function BridgeCard({ bridge, isAdmin, onDelete }) {
  const lastIns    = bridge.inspections?.[0];
  const cond       = lastIns?.conditionStatus ?? null;
  const unresolved = bridge.inspections?.filter((i) => i.defectDescription && !i.isResolved).length ?? 0;
  return (
    <article className={`bridge-card ${condClass(cond)}`}>

      <div className="bridge-card-head">
        <div style={{ minWidth: 0 }}>
          <Link to={`/bridges/${bridge.id}`} className="bridge-card-serial">
            {bridge.serialNumber}
          </Link>
          <div className="bridge-card-meta truncate">
            {bridge.structureType}
            {bridge.section ? ` · ${bridge.section}` : ''}
            {bridge.chainage != null ? ` · Km ${Number(bridge.chainage).toFixed(3)}` : ''}
          </div>
        </div>
        <ConditionBadge status={cond} />
      </div>

      <div className="bridge-card-body">
        <div className="bridge-card-stats">
          <div className="bridge-card-stat">
            <span>Inspections</span>
            <strong>{bridge._count?.inspections ?? bridge.inspections?.length ?? 0}</strong>
          </div>
          <div className="bridge-card-stat">
            <span>Last filed</span>
            <strong>
              {lastIns
                ? fmtDate(lastIns.inspectionDate)
                : <span style={{ color: 'var(--fair)' }}>Never</span>}
            </strong>
          </div>
          <div className="bridge-card-stat">
            <span>Open defects</span>
            <strong style={unresolved > 0 ? { color: 'var(--poor)' } : undefined}>
              {unresolved > 0 && <FiAlertTriangle size={11} style={{ verticalAlign: '-1px', marginRight: 3 }} />}
              {unresolved}
            </strong>
          </div>
        </div>

        {(bridge.length || bridge.width || bridge.height) && (
          <div className="muted mono" style={{ fontSize: 'var(--fs-micro)', marginTop: 'var(--sp-2)' }}>
            {[
              bridge.length && `L ${bridge.length} m`,
              bridge.width  && `W ${bridge.width} m`,
              bridge.height && `H ${bridge.height} m`,
              bridge.numberOfSpans && `${bridge.numberOfSpans} span(s)`,
            ].filter(Boolean).join('  ·  ')}
          </div>
        )}
      </div>

      <div className="bridge-card-actions no-print">
        <Link to={`/bridges/${bridge.id}`} className="btn btn-ghost btn-sm">
          <FiEye size={12} /> Profile
        </Link>
        <Link to={`/bridges/${bridge.id}/inspections/new`} className="btn btn-primary btn-sm">
          <FiPlus size={12} /> Inspect
        </Link>
        <Link to={`/bridges/${bridge.id}/edit`} className="btn btn-ghost btn-sm btn-icon" title="Edit">
          <FiEdit2 size={12} />
        </Link>
        {isAdmin && (
          <button
            className="btn btn-outline-danger btn-sm btn-icon"
            title="Hard delete structure"
            onClick={() => onDelete?.(bridge.id)}
          >
            <FiTrash2 size={12} />
          </button>
        )}
      </div>
    </article>
  );
}
