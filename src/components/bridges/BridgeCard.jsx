import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { MdVisibility, MdAdd, MdEdit, MdDelete, MdWarning, MdAccountBalance } from 'react-icons/md';
import { ConditionBadge } from '../ui/Badge';

const condBand = (s) => ({ GOOD: 'good', FAIR: 'fair', POOR: 'poor' })[s] ?? 'none';

export default function BridgeCard({ bridge, isAdmin, onDelete }) {
  const lastIns         = bridge.inspections?.[0];
  const cond            = lastIns?.conditionStatus ?? null;
  const unresolvedCount = bridge.inspections?.filter((i) => i.defectDescription && !i.isResolved).length ?? 0;

  return (
    <div className={`bridge-card ${cond === 'POOR' ? 'bridge-card-poor' : ''}`}>
      <div className={`condition-band ${condBand(cond)}`} />

      <div className="bridge-card-body">
        {/* Header */}
        <div className="bridge-card-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <MdAccountBalance style={{ color: 'var(--primary)', fontSize: 18, flexShrink: 0 }} />
            <Link to={`/bridges/${bridge.id}`} className="bridge-card-serial">
              {bridge.serialNumber}
            </Link>
          </div>
          <ConditionBadge status={cond} />
        </div>

        {/* Meta */}
        <div className="bridge-card-meta">
          <span>{bridge.structureType}</span>
          {bridge.section && <><span className="sep">·</span><span>{bridge.section}</span></>}
          {bridge.chainage && <><span className="sep">·</span><span>Km {Number(bridge.chainage).toFixed(3)}</span></>}
        </div>

        {/* Stats row */}
        <div className="bridge-card-stats">
          <div className="bridge-card-stat">
            <dt>Inspections</dt>
            <dd>{bridge._count?.inspections ?? bridge.inspections?.length ?? 0}</dd>
          </div>
          <div className="bridge-card-stat">
            <dt>Last Inspected</dt>
            <dd>
              {lastIns
                ? format(new Date(lastIns.inspectionDate), 'dd MMM yyyy')
                : <span style={{ color: 'var(--warning)', fontSize: 12, fontWeight: 600 }}><MdWarning size={11} style={{ verticalAlign: 'middle' }} /> Never</span>
              }
            </dd>
          </div>
          {unresolvedCount > 0 && (
            <div className="bridge-card-stat">
              <dt>Unresolved</dt>
              <dd style={{ color: 'var(--danger)' }}>⚠ {unresolvedCount}</dd>
            </div>
          )}
        </div>

        {/* Dimensions */}
        {(bridge.length || bridge.width) && (
          <div style={{ fontSize: 12, color: 'var(--text-light)', marginBottom: 12 }}>
            {[
              bridge.length && `L: ${bridge.length} m`,
              bridge.width  && `W: ${bridge.width} m`,
              bridge.height && `H: ${bridge.height} m`,
            ].filter(Boolean).join(' · ')}
          </div>
        )}

        {/* Actions */}
        <div className="bridge-card-actions">
          <Link to={`/bridges/${bridge.id}`} className="btn btn-ghost btn-sm" title="View">
            <MdVisibility /> View
          </Link>
          <Link to={`/bridges/${bridge.id}/inspections/new`} className="btn btn-primary btn-sm" title="Add Inspection">
            <MdAdd /> Inspect
          </Link>
          <Link to={`/bridges/${bridge.id}/edit`} className="btn btn-ghost btn-sm btn-icon" title="Edit">
            <MdEdit />
          </Link>
          {isAdmin && (
            <button className="btn btn-danger btn-sm btn-icon" title="Delete" onClick={() => onDelete?.(bridge.id)}>
              <MdDelete />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
