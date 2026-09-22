import { Link } from 'react-router-dom';
import {
  FiEye, FiPlus, FiEdit2, FiTrash2, FiAlertTriangle, FiChevronUp, FiChevronDown,
} from 'react-icons/fi';
import { ConditionBadge } from '../ui/Badge';
import { fmtDate } from '../../utils/format';

/* Colour-coded rule for the stacked mobile blocks. Presentation only. */
const condClass = (s) =>
  ({ GOOD: 'cond-good', FAIR: 'cond-fair', POOR: 'cond-poor' })[s] ?? 'cond-none';

/** Header cell that requests a server-side sort. */
function SortHeader({ column, label, sortBy, sortDir, onSort, align }) {
  const active = sortBy === column;
  const nextDir = active && sortDir === 'asc' ? 'desc' : 'asc';

  if (!onSort) return <th style={align ? { textAlign: align } : undefined}>{label}</th>;

  return (
    <th style={align ? { textAlign: align } : undefined}>
      <button
        type="button"
        className={`th-sort${active ? ' active' : ''}`}
        onClick={() => onSort(column, nextDir)}
        title={`Sort by ${label.toLowerCase()}`}
      >
        {label}
        {active
          ? (sortDir === 'asc' ? <FiChevronUp size={11} /> : <FiChevronDown size={11} />)
          : <FiChevronDown size={11} className="th-sort-idle" />}
      </button>
    </th>
  );
}

export default function BridgeTable({ bridges, isAdmin, onDelete, sortBy, sortDir, onSort }) {
  return (
    <section className="ops-panel">
      <div className="ops-scroll">
        {/* table-stack + data-label: rows become labelled blocks below 760px */}
        <table className="table ops-table table-stack">
          <thead>
            <tr>
              <SortHeader column="serial"    label="Bridge ID / Name" sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <th>Region / Location</th>
              <th>Material Type</th>
              <SortHeader column="chainage"  label="Chainage" sortBy={sortBy} sortDir={sortDir} onSort={onSort} align="right" />
              <th className="num">Span / Deck</th>
              <th className="num">Insp.</th>
              <th>Last Inspection</th>
              <SortHeader column="condition" label="Condition Rating" sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <th style={{ textAlign: 'right' }}>Operations</th>
            </tr>
          </thead>
          <tbody>
            {bridges.map((bridge) => {
              const lastIns = bridge.inspections?.[0];
              const cond    = lastIns?.conditionStatus ?? bridge.currentCondition ?? null;
              const dims    = [
                bridge.length && `${bridge.length} m`,
                bridge.width  && `${bridge.width} m`,
              ].filter(Boolean).join(' × ') || '—';

              return (
                <tr
                  key={bridge.id}
                  className={`${condClass(cond)}${cond === 'POOR' ? ' row-poor' : ''}`}
                >
                  <td data-label="Bridge ID">
                    <Link to={`/bridges/${bridge.id}`} className="serial-link">
                      {bridge.serialNumber}
                    </Link>
                    {bridge.bridgeName && (
                      <div className="muted" style={{ fontSize: 'var(--fs-micro)' }}>{bridge.bridgeName}</div>
                    )}
                  </td>

                  <td data-label="Region">{bridge.section}</td>
                  <td className="muted" data-label="Material">{bridge.structureType}</td>

                  <td className="num" data-label="Chainage">
                    {bridge.chainage != null ? `Km ${Number(bridge.chainage).toFixed(3)}` : '—'}
                  </td>

                  <td className="num muted" data-label="Span / deck">{dims}</td>
                  <td className="num" data-label="Inspections">{bridge._count?.inspections ?? 0}</td>

                  <td className="mono" style={{ fontSize: 'var(--fs-xs)' }} data-label="Last inspected">
                    {lastIns
                      ? fmtDate(lastIns.inspectionDate)
                      : (
                        <span style={{ color: 'var(--fair)', fontWeight: 650, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                          <FiAlertTriangle size={11} /> Never
                        </span>
                      )}
                  </td>

                  <td data-label="Condition"><ConditionBadge status={cond} /></td>

                  <td data-label="Operations">
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
