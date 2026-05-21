import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { MdAdd } from 'react-icons/md';

const ACTION_META = {
  CREATE:             { label: 'Bridge registered',  cls: 'create',  emoji: '🆕' },
  UPDATE:             { label: 'Bridge updated',      cls: 'update',  emoji: '✏️' },
  INSPECTION_ADDED:   { label: 'Inspection added',   cls: 'inspect', emoji: '🔍' },
  INSPECTION_UPDATED: { label: 'Inspection updated', cls: 'update',  emoji: '🔄' },
  PHOTO_UPLOADED:     { label: 'Photo uploaded',     cls: 'photo',   emoji: '📷' },
  DEFECT_RESOLVED:    { label: 'Defect resolved',    cls: 'resolve', emoji: '✅' },
};

// Safe fallback — action could be undefined if API returns an unexpected shape
function getMeta(action) {
  if (!action) return { label: 'System event', cls: 'update', emoji: '📝' };
  return ACTION_META[action] ?? {
    label: action.replace(/_/g, ' '),
    cls: 'update',
    emoji: '📝',
  };
}

const safeFromNow = (d) => {
  if (!d) return '';
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? '' : formatDistanceToNow(dt, { addSuffix: true });
};

export default function RecentActivity({ logs = [] }) {
  return (
    <div className="card" style={{ minHeight: 0 }}>
      <div className="card-header">
        <div>
          <div className="card-title">Recent Activity</div>
          <div className="card-subtitle">Latest system events</div>
        </div>
        <Link to="/bridges/new" className="btn btn-primary btn-sm no-print">
          <MdAdd /> Add Bridge
        </Link>
      </div>
      <div className="card-body" style={{ padding: '8px 20px' }}>
        {logs.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: 14, padding: '20px 0' }}>No activity yet.</p>
        ) : (
          <div className="activity-feed">
            {logs.map((log) => {
              // Field renamed from `action` to `actionType` in schema v2 — use actionType
              const meta = getMeta(log.actionType);
              return (
                <div key={log.id} className="activity-item">
                  <div className={`activity-dot ${meta.cls}`}>{meta.emoji}</div>
                  <div className="activity-body">
                    <strong>
                      {meta.label}
                      {log.bridge && (
                        <> — <Link to={`/bridges/${log.bridgeId}`} style={{ color: 'var(--primary)' }}>{log.bridge.serialNumber}</Link></>
                      )}
                    </strong>
                    <span>
                      {log.user ? `${log.user.firstName} ${log.user.lastName}` : 'System'}
                      {log.bridge?.section && ` · ${log.bridge.section}`}
                    </span>
                  </div>
                  <div className="activity-time">
                    {safeFromNow(log.createdAt)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
