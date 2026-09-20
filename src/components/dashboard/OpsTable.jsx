import { Link } from 'react-router-dom';
import {
  FiCheckCircle, FiTrash2, FiEye, FiArrowRight, FiClipboard, FiAlertTriangle,
} from 'react-icons/fi';
import { ConditionBadge } from '../ui/Badge';
import { fmtDate } from '../../utils/format';

/**
 * Section C — data operations table.
 *
 * "Approve" is a real state transition: it calls the inspection resolve
 * endpoint, which stamps resolved_at / resolved_by and writes a
 * DEFECT_RESOLVED history entry. Inspections with no recorded defect have
 * nothing to approve, so they offer Review instead.
 *
 * "Hard Delete" is exactly that — the row is removed from MySQL and cannot
 * be recovered. Admin only, always behind a confirmation.
 */
export default function OpsTable({ rows = [], isAdmin, onApprove, onDelete, busyId }) {
  if (rows.length === 0) {
    return (
      <div className="ops-panel">
        <div className="ops-head">
          <span className="ops-title"><FiClipboard size={14} /> Recent Bridge Inspections</span>
        </div>
        <div className="empty-state">
          <FiClipboard />
          <h3>No inspections recorded</h3>
          <p>Inspection records are created from a structure profile in the inventory.</p>
          <Link to="/bridges" className="btn btn-primary btn-sm">Open inventory</Link>
        </div>
      </div>
    );
  }

  return (
    <section className="ops-panel" aria-label="Recent bridge inspections">
      <div className="ops-head">
        <span className="ops-title">
          <FiClipboard size={14} /> Recent Bridge Inspections
          <span className="ops-count">{rows.length}</span>
        </span>
        <Link to="/inspections" className="btn btn-ghost btn-sm no-print">
          Full log <FiArrowRight size={12} />
        </Link>
      </div>

      <div className="ops-scroll">
        <table className="table ops-table">
          <thead>
            <tr>
              <th>Bridge ID / Name</th>
              <th>Region / Location</th>
              <th>Material Type</th>
              <th>Last Inspection</th>
              <th>Condition Rating</th>
              <th style={{ textAlign: 'right' }}>Operations</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((ins) => {
              const b = ins.bridge ?? {};
              const hasOpenDefect = Boolean(ins.defectDescription) && !ins.isResolved;
              const busy = busyId === ins.id;

              return (
                <tr key={ins.id} className={ins.conditionStatus === 'POOR' ? 'row-poor' : ''}>
                  <td>
                    <Link to={`/bridges/${ins.bridgeId}`} className="serial-link">
                      {b.serialNumber ?? `#${ins.bridgeId}`}
                    </Link>
                    {b.bridgeName && (
                      <div className="muted" style={{ fontSize: 'var(--fs-xs)' }}>{b.bridgeName}</div>
                    )}
                  </td>

                  <td>
                    <span>{b.section ?? '—'}</span>
                    {b.chainage != null && (
                      <div className="muted mono" style={{ fontSize: 'var(--fs-micro)' }}>
                        Km {Number(b.chainage).toFixed(3)}
                      </div>
                    )}
                  </td>

                  <td className="muted">{b.structureType ?? '—'}</td>

                  <td className="mono" style={{ fontSize: 'var(--fs-xs)' }}>
                    {fmtDate(ins.inspectionDate)}
                  </td>

                  <td>
                    <ConditionBadge status={ins.conditionStatus} />
                    {hasOpenDefect && (
                      <div className="resolve-status unresolved" style={{ marginTop: 3 }}>
                        <FiAlertTriangle size={11} /> Open defect
                      </div>
                    )}
                    {ins.isResolved && ins.defectDescription && (
                      <div className="resolve-status resolved" style={{ marginTop: 3 }}>
                        <FiCheckCircle size={11} /> Signed off
                      </div>
                    )}
                  </td>

                  <td>
                    <div className="ops-actions no-print">
                      {hasOpenDefect ? (
                        <button
                          className="btn btn-outline-success btn-sm"
                          onClick={() => onApprove(ins)}
                          disabled={busy}
                          title="Approve — mark this defect resolved"
                        >
                          {busy ? <span className="spinner spinner-sm" /> : <FiCheckCircle size={12} />}
                          Approve
                        </button>
                      ) : (
                        <Link
                          to={`/bridges/${ins.bridgeId}`}
                          className="btn btn-ghost btn-sm"
                          title="Review the full inspection record"
                        >
                          <FiEye size={12} /> Review
                        </Link>
                      )}

                      {isAdmin && (
                        <button
                          className="btn btn-outline-danger btn-sm"
                          onClick={() => onDelete(ins)}
                          disabled={busy}
                          title="Hard delete — permanently removes this inspection record"
                        >
                          <FiTrash2 size={12} /> Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
