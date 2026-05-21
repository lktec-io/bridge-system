import { format } from 'date-fns';
import {
  MdAddCircle, MdEdit, MdSearch, MdSync,
  MdPhotoCamera, MdCheckCircle, MdNotes,
} from 'react-icons/md';

const ACTION_ICON = {
  CREATE:             MdAddCircle,
  UPDATE:             MdEdit,
  INSPECTION_ADDED:   MdSearch,
  INSPECTION_UPDATED: MdSync,
  PHOTO_UPLOADED:     MdPhotoCamera,
  DEFECT_RESOLVED:    MdCheckCircle,
};

const ACTION_LABEL = {
  CREATE:             'Bridge registered',
  UPDATE:             'Bridge updated',
  INSPECTION_ADDED:   'Inspection added',
  INSPECTION_UPDATED: 'Inspection updated',
  PHOTO_UPLOADED:     'Photo uploaded',
  DEFECT_RESOLVED:    'Defect resolved',
};

const getIcon = (action) => ACTION_ICON[action] ?? MdNotes;
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
      {logs.map((log) => {
        const IconComp = getIcon(log.actionType);
        return (
          <div key={log.id} className="timeline-item">
            <div className="timeline-dot"><IconComp size={16} /></div>
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
        );
      })}
    </div>
  );
}
