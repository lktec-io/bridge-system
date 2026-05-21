import { Link } from 'react-router-dom';
import { format, formatDistanceToNow } from 'date-fns';
import { MdCheckCircle, MdWarning, MdEdit, MdDelete } from 'react-icons/md';
import { ConditionBadge } from '../ui/Badge';

const safeDate = (d, fmt) => {
  if (!d) return '—';
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? '—' : format(dt, fmt);
};
const safeFromNow = (d) => {
  if (!d) return '';
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? '' : formatDistanceToNow(dt, { addSuffix: true });
};

const condClass = (s) => ({ GOOD: 'card-good', FAIR: 'card-fair', POOR: 'card-poor' })[s] ?? '';

export default function InspectionCard({
  inspection: ins,
  bridgeId,
  isAdmin,
  isLatest = false,
  prevCondition,
  onResolve,
  onDelete,
  resolving = false,
}) {
  const hasDefect = Boolean(ins.defectDescription);
  const changed   = prevCondition && prevCondition !== ins.conditionStatus;
  const improved  = changed && (
    ins.conditionStatus === 'GOOD' ||
    (ins.conditionStatus === 'FAIR' && prevCondition === 'POOR')
  );

  return (
    <div className={`inspection-card ${condClass(ins.conditionStatus)} ${ins.isResolved ? 'resolved' : ''}`}>

      {/* ── Head ──────────────────────────────────────────── */}
      <div className="inspection-card-head">
        <div className="inspection-card-meta">
          <span className="inspection-card-date">
            {safeDate(ins.inspectionDate, 'dd MMMM yyyy')}
          </span>
          <span className="inspection-card-inspector">— {ins.inspectorName}</span>
          <ConditionBadge status={ins.conditionStatus} />

          {changed && (
            <span className={`condition-change ${improved ? 'improved' : 'worsened'}`}>
              {improved ? '↑ Improved' : '↓ Worsened'}
            </span>
          )}
          {isLatest && (
            <span style={{ fontSize: 11, background: 'var(--primary-light)', color: 'var(--primary)', padding: '2px 8px', borderRadius: 99, fontWeight: 700 }}>
              Latest
            </span>
          )}
        </div>

        <div className="inspection-card-actions no-print">
          {hasDefect && !ins.isResolved && (
            <button className="btn btn-success btn-sm" onClick={() => onResolve?.(ins.id)} disabled={resolving}>
              {resolving ? '...' : <><MdCheckCircle size={14} /> Mark Resolved</>}
            </button>
          )}
          <Link to={`/bridges/${bridgeId}/inspections/${ins.id}/edit`} className="btn btn-ghost btn-sm btn-icon" title="Edit">
            <MdEdit />
          </Link>
          {isAdmin && (
            <button className="btn btn-danger btn-sm btn-icon" onClick={() => onDelete?.(ins.id)} title="Delete">
              <MdDelete />
            </button>
          )}
        </div>
      </div>

      {/* ── Body ──────────────────────────────────────────── */}
      <div className="inspection-card-body">
        <div className="inspection-field">
          <dt>Defect Description</dt>
          <dd>{ins.defectDescription || <em style={{ color: 'var(--text-light)' }}>No defects reported</em>}</dd>
        </div>
        <div className="inspection-field">
          <dt>Remedy / Action</dt>
          <dd>{ins.remedy || <em style={{ color: 'var(--text-light)' }}>No remedy specified</em>}</dd>
        </div>
        {ins.lastVisitDate && (
          <div className="inspection-field">
            <dt>Last Visit</dt>
            <dd>{format(new Date(ins.lastVisitDate), 'dd MMM yyyy')}</dd>
          </div>
        )}
        <div className="inspection-field">
          <dt>Defect Status</dt>
          <dd>
            {!hasDefect ? (
              <span style={{ color: 'var(--success)', fontSize: 13 }}>✓ Clean — no defects</span>
            ) : ins.isResolved ? (
              <span className="resolve-status resolved">
                <MdCheckCircle size={13} />
                Resolved{ins.resolvedAt ? ` on ${format(new Date(ins.resolvedAt), 'dd MMM yyyy')}` : ''}
                {ins.resolvedBy ? ` by ${ins.resolvedBy}` : ''}
              </span>
            ) : (
              <span className="resolve-status unresolved">
                <MdWarning size={13} /> Unresolved — action required
              </span>
            )}
          </dd>
        </div>
      </div>

      {/* ── Footer ────────────────────────────────────────── */}
      {ins.user && (
        <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text-light)', borderTop: '1px solid var(--border)', paddingTop: 8 }}>
          Recorded by {ins.user.firstName} {ins.user.lastName}
          {' · '}{safeFromNow(ins.createdAt)}
        </div>
      )}
    </div>
  );
}
