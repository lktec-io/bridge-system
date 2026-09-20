import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import {
  FiPlusCircle, FiEdit2, FiSearch, FiRefreshCw,
  FiCamera, FiCheckCircle, FiFileText, FiTool,
} from 'react-icons/fi';

/* action_type values written by historyService, mapped to a label and colour. */
const ACTION_META = {
  CREATE:              { label: 'Structure registered', Icon: FiPlusCircle, color: 'var(--info)' },
  UPDATE:              { label: 'Structure updated',    Icon: FiEdit2,      color: 'var(--text-muted)' },
  INSPECTION_ADDED:    { label: 'Inspection filed',     Icon: FiSearch,     color: 'var(--accent)' },
  INSPECTION_UPDATED:  { label: 'Inspection amended',   Icon: FiRefreshCw,  color: 'var(--text-muted)' },
  PHOTO_UPLOADED:      { label: 'Imagery attached',     Icon: FiCamera,     color: 'var(--info)' },
  DEFECT_RESOLVED:     { label: 'Defect signed off',    Icon: FiCheckCircle, color: 'var(--good)' },
  MAINTENANCE_LOGGED:  { label: 'Work order raised',    Icon: FiTool,       color: 'var(--accent)' },
  MAINTENANCE_UPDATED: { label: 'Work order updated',   Icon: FiTool,       color: 'var(--text-muted)' },
};

function getMeta(action) {
  if (!action) return { label: 'System event', Icon: FiFileText, color: 'var(--text-muted)' };
  return ACTION_META[action] ?? {
    label: action.replace(/_/g, ' ').toLowerCase(),
    Icon: FiFileText,
    color: 'var(--text-muted)',
  };
}

const safeFromNow = (d) => {
  if (!d) return '';
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? '' : formatDistanceToNow(dt, { addSuffix: true });
};

export default function RecentActivity({ logs = [] }) {
  return (
    <div className="tile" style={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>
      <div className="card-header">
        <div>
          <div className="card-title">Audit Trail</div>
          <div className="card-subtitle">Every recorded change, newest first</div>
        </div>
        <Link to="/bridges/new" className="btn btn-primary btn-sm no-print">Register</Link>
      </div>

      {logs.length === 0 ? (
        <div className="empty-state">
          <FiFileText />
          <p>No recorded activity yet.</p>
        </div>
      ) : (
        <div className="activity-feed">
          {logs.map((log) => {
            // Schema v2 renamed history_logs.action → action_type (actionType in JSON)
            const { label, Icon, color } = getMeta(log.actionType);
            return (
              <div key={log.id} className="activity-item">
                <span className="activity-dot" style={{ background: color }} aria-hidden="true" />
                <div className="activity-body">
                  <strong>
                    <Icon size={12} style={{ verticalAlign: '-2px', marginRight: 5, color }} />
                    {label}
                    {log.bridge && (
                      <>
                        {' — '}
                        <Link to={`/bridges/${log.bridgeId}`} className="serial-link">
                          {log.bridge.serialNumber}
                        </Link>
                      </>
                    )}
                  </strong>
                  <div className="muted" style={{ fontSize: 'var(--fs-xs)' }}>
                    {log.user ? `${log.user.firstName} ${log.user.lastName}` : 'System'}
                    {log.bridge?.section ? ` · ${log.bridge.section}` : ''}
                  </div>
                  <div className="activity-time">{safeFromNow(log.createdAt)}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
