import { Link } from 'react-router-dom';
import {
  FiEye, FiPlus, FiEdit2, FiTrash2, FiAlertTriangle,
} from 'react-icons/fi';
import { ConditionBadge } from '../ui/Badge';
import { fmtDate } from '../../utils/format';

export default function BridgeTable({ bridges, isAdmin, onDelete }) {
  return (
    <section className="ops-panel">
      <div className="ops-scroll">
        <table className="table ops-table">
          <thead>
            <tr>
              <th>Bridge ID / Name</th>
              <th>Region / Location</th>
              <th>Material Type</th>
              <th className="num">Chainage</th>
              <th className="num">Span / Deck</th>
              <th className="num">Insp.</th>
              <th>Last Inspection</th>
              <th>Condition Rating</th>
              <th style={{ textAlign: 'right' }}>Operations</th>
            </tr>
          </thead>
          <tbody>
            {bridges.map((bridge) => {
              const lastIns = bridge.inspections?.[0];
              const cond    = lastIns?.conditionStatus ?? null;
              const dims    = [
                bridge.length && `${bridge.length} m`,
                bridge.width  && `${bridge.width} m`,
              ].filter(Boolean).join(' × ') || '—';

              return (
                <tr key={bridge.id} className={cond === 'POOR' ? 'row-poor' : ''}>
                  <td>
                    <Link to={`/bridges/${bridge.id}`} className="serial-link">
                      {bridge.serialNumber}
                    </Link>
                    {bridge.bridgeName && (
                      <div className="muted" style={{ fontSize: 'var(--fs-micro)' }}>{bridge.bridgeName}</div>
                    )}
                  </td>

                  <td>{bridge.section}</td>

                  <td className="muted">{bridge.structureType}</td>

                  <td className="num">
                    {bridge.chainage != null ? `Km ${Number(bridge.chainage).toFixed(3)}` : '—'}
                  </td>

                  <td className="num muted">{dims}</td>

                  <td className="num">{bridge._count?.inspections ?? 0}</td>

                  <td className="mono" style={{ fontSize: 'var(--fs-xs)' }}>
                    {lastIns
                      ? fmtDate(lastIns.inspectionDate)
                      : (
                        <span style={{ color: 'var(--fair)', fontWeight: 650, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                          <FiAlertTriangle size={11} /> Never
                        </span>
                      )}
                  </td>

                  <td><ConditionBadge status={cond} /></td>

                  <td>
                    <div className="ops-actions no-print">
                      <Link to={`/bridges/${bridge.id}`} className="btn btn-ghost btn-sm btn-icon" title="Open profile">
                        <FiEye size={13} />
                      </Link>
                      <Link to={`/bridges/${bridge.id}/inspections/new`} className="btn btn-primary btn-sm btn-icon" title="File inspection">
                        <FiPlus size={13} />
                      </Link>
                      <Link to={`/bridges/${bridge.id}/edit`} className="btn btn-ghost btn-sm btn-icon" title="Edit record">
                        <FiEdit2 size={13} />
                      </Link>
                      {isAdmin && (
                        <button
                          className="btn btn-outline-danger btn-sm btn-icon"
                          title="Hard delete structure"
                          onClick={() => onDelete(bridge.id)}
                        >
                          <FiTrash2 size={13} />
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
