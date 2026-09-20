import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import {
  FiCheckCircle, FiAlertTriangle, FiEdit2, FiTrash2,
  FiTrendingUp, FiTrendingDown,
} from 'react-icons/fi';
import { ConditionBadge } from '../ui/Badge';
import { fmtDate, fmtDateLong } from '../../utils/format';

const condClass = (s) => ({ GOOD: 'cond-good', FAIR: 'cond-fair', POOR: 'cond-poor' })[s] ?? '';

const safeFromNow = (d) => {
  if (!d) return '';
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? '' : formatDistanceToNow(dt, { addSuffix: true });
};

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
    <article className={`inspection-card ${condClass(ins.conditionStatus)}`}>

      <div className="inspection-card-head">
        <div style={{ minWidth: 0 }}>
          <div className="inspection-card-date">{fmtDateLong(ins.inspectionDate)}</div>
          <div className="inspection-card-inspector">Inspector: {ins.inspectorName}</div>
        </div>

        <div className="inspection-card-meta">
          {isLatest && <span className="chip chip-accent">Latest</span>}
          {changed && (
            <span className={`condition-change ${improved ? 'improved' : 'worsened'}`}
                  style={{ color: improved ? 'var(--good)' : 'var(--poor)' }}>
              {improved ? <FiTrendingUp size={11} /> : <FiTrendingDown size={11} />}
              {improved ? 'Improved' : 'Worsened'}
            </span>
          )}
          <ConditionBadge status={ins.conditionStatus} />
        </div>
      </div>

      <div className="inspection-card-body">
        <div className="inspection-field">
          <span className="label-tech">Defect description</span>
          <p>{ins.defectDescription || <span className="muted">No defects reported</span>}</p>
        </div>

        <div className="inspection-field">
          <span className="label-tech">Remedy / action</span>
          <p>{ins.remedy || <span className="muted">No remedy specified</span>}</p>
        </div>

        <div className="bd-grid-2col">
          {ins.lastVisitDate && (
            <div className="inspection-field">
              <span className="label-tech">Previous site visit</span>
              <p className="mono">{fmtDate(ins.lastVisitDate)}</p>
            </div>
          )}
          <div className="inspection-field">
            <span className="label-tech">Defect status</span>
            <p>
              {!hasDefect ? (
                <span className="resolve-status resolved">
                  <FiCheckCircle size={12} /> Clean — no defects
                </span>
              ) : ins.isResolved ? (
                <span className="resolve-status resolved">
                  <FiCheckCircle size={12} />
                  Signed off{ins.resolvedAt ? ` ${fmtDate(ins.resolvedAt)}` : ''}
                  {ins.resolvedBy ? ` by ${ins.resolvedBy}` : ''}
                </span>
              ) : (
                <span className="resolve-status unresolved">
                  <FiAlertTriangle size={12} /> Unresolved — action required
                </span>
              )}
            </p>
          </div>
        </div>

        {ins.user && (
          <div className="muted" style={{
            fontSize: 'var(--fs-micro)', marginTop: 'var(--sp-3)',
            paddingTop: 'var(--sp-2)', borderTop: '1px solid var(--border)',
          }}>
            Recorded by {ins.user.firstName} {ins.user.lastName} · {safeFromNow(ins.createdAt)}
          </div>
        )}
      </div>

      <div className="inspection-card-actions no-print">
        {hasDefect && !ins.isResolved && (
          <button className="btn btn-outline-success btn-sm" onClick={() => onResolve?.(ins.id)} disabled={resolving}>
            {resolving ? <span className="spinner spinner-sm" /> : <FiCheckCircle size={12} />}
            Approve / sign off
          </button>
        )}
        <Link to={`/bridges/${bridgeId}/inspections/${ins.id}/edit`} className="btn btn-ghost btn-sm">
          <FiEdit2 size={12} /> Edit
        </Link>
        {isAdmin && (
          <button className="btn btn-outline-danger btn-sm btn-icon" onClick={() => onDelete?.(ins.id)} title="Hard delete inspection">
            <FiTrash2 size={12} />
          </button>
        )}
      </div>
    </article>
  );
}
