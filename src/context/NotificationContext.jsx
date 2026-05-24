import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { bridgesAPI } from '../api/bridges';
import { useAuth } from './AuthContext';

const NotificationContext = createContext(null);
export const useNotifications = () => useContext(NotificationContext);

const READ_KEY = 'bms_notif_read';

function getReadSet() {
  try { return new Set(JSON.parse(localStorage.getItem(READ_KEY) || '[]')); }
  catch { return new Set(); }
}
function saveReadSet(set) {
  localStorage.setItem(READ_KEY, JSON.stringify([...set]));
}

function formatAction(type) {
  switch (type) {
    case 'BRIDGE_CREATED':      return 'New bridge registered';
    case 'BRIDGE_UPDATED':      return 'Bridge record updated';
    case 'BRIDGE_DELETED':      return 'Bridge deleted';
    case 'INSPECTION_CREATED':  return 'New inspection recorded';
    case 'INSPECTION_UPDATED':  return 'Inspection updated';
    case 'INSPECTION_RESOLVED': return 'Defect marked resolved';
    case 'PHOTO_UPLOADED':      return 'Photo uploaded';
    default: return (type || 'System event').replace(/_/g, ' ');
  }
}

function buildNotifications(data) {
  const notifs = [];
  const { conditionCounts = {}, unresolvedDefects = 0, recentActivity = [] } = data;

  if ((conditionCounts.POOR ?? 0) > 0) {
    notifs.push({
      id:      `sys-poor-${conditionCounts.POOR}`,
      type:    'danger',
      title:   `${conditionCounts.POOR} bridge(s) in POOR condition`,
      message: 'Urgent maintenance required',
      ts:      '2000-01-01T00:00:00Z',
    });
  }

  if (unresolvedDefects > 0) {
    notifs.push({
      id:      `sys-unresolved-${unresolvedDefects}`,
      type:    'warning',
      title:   `${unresolvedDefects} unresolved defect(s)`,
      message: 'Open inspections with reported defects pending resolution',
      ts:      '2000-01-02T00:00:00Z',
    });
  }

  for (const log of (recentActivity ?? []).slice(0, 8)) {
    notifs.push({
      id:      `activity-${log.id}`,
      type:    'info',
      title:   formatAction(log.actionType),
      message: `${log.bridge?.serialNumber ?? 'Bridge'} · ${log.user ? `${log.user.firstName} ${log.user.lastName}` : 'System'}`,
      ts:      log.createdAt,
    });
  }

  return notifs;
}

export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [readSet, setReadSet] = useState(getReadSet);

  const fetchNotifs = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await bridgesAPI.getDashboard();
      setNotifications(buildNotifications(data));
    } catch { /* silent — auth errors are handled by axios interceptor */ }
  }, [user]);

  useEffect(() => {
    fetchNotifs();
    if (!user) return;
    const interval = setInterval(fetchNotifs, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchNotifs, user]);

  const unreadCount = notifications.filter(n => !readSet.has(n.id)).length;

  const markAllRead = () => {
    const next = new Set([...readSet, ...notifications.map(n => n.id)]);
    setReadSet(next);
    saveReadSet(next);
  };

  const markRead = (id) => {
    const next = new Set([...readSet, id]);
    setReadSet(next);
    saveReadSet(next);
  };

  const isRead = (id) => readSet.has(id);

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, markAllRead, markRead, isRead, fetchNotifs }}>
      {children}
    </NotificationContext.Provider>
  );
}
