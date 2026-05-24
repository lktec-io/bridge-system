import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { MdVisibility, MdAdd, MdEdit, MdDelete, MdWarning } from 'react-icons/md';
import { ConditionBadge } from '../ui/Badge';

export default function BridgeTable({ bridges, isAdmin, onDelete }) {
  return (
    <div className="table-wrapper bridge-table-wrapper">
      <table className="table">
        <thead>
          <tr>
            <th>Serial No.</th>
            <th>Type</th>
            <th>Section</th>
            <th>Chainage (Km)</th>
            <th>Dimensions</th>
            <th>Inspections</th>
            <th>Last Inspected</th>
            <th>Condition</th>
            <th style={{ textAlign: 'center' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {bridges.map((bridge) => {
            const lastIns = bridge.inspections?.[0];
            const cond    = lastIns?.conditionStatus ?? null;
            const dims    = [
              bridge.length && `L:${bridge.length}m`,
              bridge.width  && `W:${bridge.width}m`,
            ].filter(Boolean).join(' · ') || '—';

            return (
              <tr key={bridge.id} className={cond === 'POOR' ? 'row-poor' : ''}>
                <td>
                  <Link to={`/bridges/${bridge.id}`} style={{ color: 'var(--primary)', fontWeight: 700 }}>
                    {bridge.serialNumber}
                  </Link>
                </td>
                <td className="muted">{bridge.structureType}</td>
                <td>{bridge.section}</td>
                <td className="muted">{Number(bridge.chainage).toFixed(3)}</td>
                <td className="muted" style={{ fontSize: 12 }}>{dims}</td>
                <td className="muted">{bridge._count?.inspections ?? 0}</td>
                <td className="muted">
                  {lastIns
                    ? format(new Date(lastIns.inspectionDate), 'dd MMM yyyy')
                    : <span style={{ color: 'var(--warning)', fontSize: 12, fontWeight: 600 }}>
                        <MdWarning size={12} style={{ verticalAlign: 'middle' }} /> Never
                      </span>
                  }
                </td>
                <td><ConditionBadge status={cond} /></td>
                <td>
                  <div style={{ display: 'flex', gap: 5, justifyContent: 'center' }}>
                    <Link to={`/bridges/${bridge.id}`}               className="btn btn-ghost btn-sm btn-icon" title="View"><MdVisibility /></Link>
                    <Link to={`/bridges/${bridge.id}/inspections/new`} className="btn btn-primary btn-sm btn-icon" title="Add Inspection"><MdAdd /></Link>
                    <Link to={`/bridges/${bridge.id}/edit`}           className="btn btn-ghost btn-sm btn-icon" title="Edit"><MdEdit /></Link>
                    {isAdmin && (
                      <button className="btn btn-danger btn-sm btn-icon" title="Delete" onClick={() => onDelete(bridge.id)}>
                        <MdDelete />
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
  );
}
