import { format } from 'date-fns';

const ACTION_EMOJI = {
  CREATE:             '🆕',
  UPDATE:             '✏️',
  INSPECTION_ADDED:   '🔍',
  INSPECTION_UPDATED: '🔄',
  PHOTO_UPLOADED:     '📷',
  DEFECT_RESOLVED:    '✅',
};

const ACTION_LABEL = {
  CREATE:             'Bridge registered',
  UPDATE:             'Bridge updated',
  INSPECTION_ADDED:   'Inspection added',
  INSPECTION_UPDATED: 'Inspection updated',
  PHOTO_UPLOADED:     'Photo uploaded',
  DEFECT_RESOLVED:    'Defect resolved',
};

const emoji = (action) => ACTION_EMOJI[action] ?? '📝';
// Guard against null/undefined actionType — action.replace() crashes if action is falsy
const label = (action) => ACTION_LABEL[action] ?? (action ? action.replace(/_/g, ' ') : 'System event');

const safeDate = (d, fmt) => {
  if (!d) return '—';
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? '—' : format(dt, fmt);
};

export default function InspectionHistory({ logs = [] }) {
  if (logs.length === 0) {
    return <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No history recorded.</p>;
  }

  return (
    <div className="timeline">
      {logs.map((log) => (
        <div key={log.id} className="timeline-item">
          <div className="timeline-dot">{emoji(log.actionType)}</div>
          <div className="timeline-content">
            <strong>{label(log.actionType)}</strong>
            {log.user && (
              <p>By {log.user.firstName} {log.user.lastName}</p>
            )}
            {log.newValues && Object.keys(log.newValues).length > 0 && (
              <p style={{ fontSize: 12, color: 'var(--text-light)', marginTop: 2 }}>
                Fields: {Object.keys(log.newValues).join(', ')}
              </p>
            )}
            <div className="timeline-time">
              {safeDate(log.createdAt, 'dd MMM yyyy, HH:mm')}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
