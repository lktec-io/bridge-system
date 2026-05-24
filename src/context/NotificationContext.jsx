import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { notificationsAPI } from '../api/notifications';
import { useAuth } from './AuthContext';

const NotificationContext = createContext(null);
export const useNotifications = () => useContext(NotificationContext);

export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);

  const fetchNotifs = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await notificationsAPI.getAll();
      setNotifications(Array.isArray(data) ? data : []);
    } catch { /* silent — auth errors handled by axios interceptor */ }
  }, [user]);

  useEffect(() => {
    fetchNotifs();
    if (!user) return;
    const interval = setInterval(fetchNotifs, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchNotifs, user]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const markAllRead = async () => {
    try {
      await notificationsAPI.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch { /* silent */ }
  };

  const markRead = async (id) => {
    try {
      await notificationsAPI.markRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
    } catch { /* silent */ }
  };

  const isRead = (id) => notifications.find((n) => n.id === id)?.isRead ?? false;

  return (
    <NotificationContext.Provider
      value={{ notifications, unreadCount, markAllRead, markRead, isRead, fetchNotifs }}
    >
      {children}
    </NotificationContext.Provider>
  );
}
