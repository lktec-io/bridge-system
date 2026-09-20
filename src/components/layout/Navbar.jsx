import { useRef, useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  FiMenu, FiX, FiBell, FiLogOut, FiSun, FiMoon,
  FiAlertCircle, FiAlertTriangle, FiInfo, FiCheck,
} from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useNotifications } from '../../context/NotificationContext';

const ROUTE_META = {
  '/dashboard':   { title: 'Structural Command Overview', subtitle: 'Live asset condition, alerts and inspection throughput' },
  '/bridges':     { title: 'Bridge Inventory',            subtitle: 'Registered structures, condition state and geometry' },
  '/bridges/new': { title: 'Register Structure',          subtitle: 'Add a new bridge asset to the inventory' },
  '/inspections': { title: 'Inspection Logs',             subtitle: 'Field inspection records across all structures' },
  '/maintenance': { title: 'Maintenance Schedules',       subtitle: 'Planned, active and completed maintenance works' },
  '/sensors':     { title: 'Sensor / IoT Analytics',      subtitle: 'Structural telemetry streams and threshold breaches' },
  '/alerts':      { title: 'Structural Health Alerts',    subtitle: 'Critical conditions and overdue inspection signals' },
  '/map':         { title: 'GIS Bridge Map',              subtitle: 'Geospatial distribution of monitored structures' },
  '/logs':        { title: 'System Logs',                 subtitle: 'Audit trail of every recorded change' },
  '/users':       { title: 'System Administration',       subtitle: 'Operator accounts and access control' },
};

function resolvePageMeta(pathname) {
  const exact = ROUTE_META[pathname];
  if (exact) return exact;
  if (pathname.includes('/inspections/new'))
    return { title: 'New Inspection',    subtitle: 'Record a field inspection result' };
  if (/\/inspections\/\d+\/edit/.test(pathname))
    return { title: 'Edit Inspection',   subtitle: 'Amend an existing inspection record' };
  if (pathname.includes('/edit'))
    return { title: 'Edit Structure',    subtitle: 'Update bridge asset attributes' };
  if (/\/bridges\/\d+$/.test(pathname))
    return { title: 'Structure Profile', subtitle: 'Full asset record, inspections and imagery' };
  return { title: 'Bridge Management System', subtitle: 'Infrastructure monitoring terminal' };
}

const NOTIF_ICON = {
  danger:  <FiAlertCircle   size={13} />,
  warning: <FiAlertTriangle size={13} />,
  info:    <FiInfo          size={13} />,
};

/* Backend emits domain event types; map them to a severity channel. */
const SEVERITY = {
  INSPECTION_POOR:     'danger',
  BRIDGE_DELETED:      'danger',
  MAINTENANCE_OVERDUE: 'warning',
  INSPECTION_OVERDUE:  'warning',
  SENSOR_THRESHOLD:    'warning',
  INSPECTION_RESOLVED: 'info',
  BRIDGE_CREATED:      'info',
  MAINTENANCE_LOGGED:  'info',
};

const severityOf = (n) => SEVERITY[n.type] ?? (['danger', 'warning', 'info'].includes(n.type) ? n.type : 'info');

const NOTIF_COLOR = {
  danger:  'var(--poor)',
  warning: 'var(--fair)',
  info:    'var(--info)',
};

function timeAgo(ts) {
  const diff = Date.now() - new Date(ts).getTime();
  const min  = Math.floor(diff / 60000);
  if (min < 1)  return 'just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr  < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}

export default function Navbar({ onMenuClick, sidebarOpen }) {
  const { pathname } = useLocation();
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { notifications, unreadCount, markAllRead, markRead, isRead } = useNotifications();
  const { title, subtitle } = resolvePageMeta(pathname);

  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler, { passive: true });
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, []);

  // Close the panel on Escape for keyboard operators
  useEffect(() => {
    if (!notifOpen) return;
    const onKey = (e) => { if (e.key === 'Escape') setNotifOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [notifOpen]);

  const initials = user
    ? `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase()
    : '?';

  const rolePill = user?.role === 'ADMIN'
    ? { background: 'var(--accent-light)', color: 'var(--accent-darker)', border: '1px solid var(--accent-border)' }
    : { background: 'var(--primary-light)', color: 'var(--text-strong)', border: '1px solid var(--border-strong)' };

  return (
    <header className="topbar">

      <div className="topbar-left">
        <button className="hamburger" onClick={onMenuClick} aria-label="Toggle navigation">
          {sidebarOpen ? <FiX size={19} /> : <FiMenu size={19} />}
        </button>
        <div style={{ minWidth: 0 }}>
          <div className="topbar-title">{title}</div>
          {subtitle && <div className="topbar-subtitle">{subtitle}</div>}
        </div>
      </div>

      <div className="topbar-right">

        <button
          className="navbar-icon-btn"
          onClick={toggleTheme}
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDark ? <FiSun size={16} /> : <FiMoon size={16} />}
        </button>

        <div className="notif-wrapper" ref={notifRef}>
          <button
            className={`navbar-icon-btn navbar-bell${notifOpen ? ' notif-btn-active' : ''}`}
            onClick={() => setNotifOpen((v) => !v)}
            title="Structural health signals"
            aria-label="Notifications"
            aria-expanded={notifOpen}
          >
            <FiBell size={16} />
            {unreadCount > 0 && (
              <span className="bell-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
            )}
          </button>

          {notifOpen && (
            <div className="notif-dropdown" role="dialog" aria-label="Notifications">
              <div className="notif-dropdown-header">
                <span className="notif-dropdown-title">
                  Signals
                  {unreadCount > 0 && <span className="notif-unread-pill">{unreadCount} new</span>}
                </span>
                {unreadCount > 0 && (
                  <button className="notif-mark-all" onClick={markAllRead}>
                    <FiCheck size={11} /> Mark all read
                  </button>
                )}
              </div>

              <div className="notif-list">
                {notifications.length === 0 ? (
                  <div className="notif-empty">
                    <FiBell size={22} style={{ opacity: .25 }} />
                    <span>No active signals</span>
                  </div>
                ) : (
                  notifications.map((n) => {
                    const sev = severityOf(n);
                    return (
                      <div
                        key={n.id}
                        className={`notif-item${isRead(n.id) ? ' notif-read' : ''}`}
                        onClick={() => !isRead(n.id) && markRead(n.id)}
                      >
                        <div className="notif-item-icon" style={{ color: NOTIF_COLOR[sev] }}>
                          {NOTIF_ICON[sev]}
                        </div>
                        <div className="notif-item-body">
                          <div className="notif-item-title">{n.title}</div>
                          <div className="notif-item-msg">{n.message}</div>
                          <div className="notif-item-time">{timeAgo(n.createdAt)}</div>
                        </div>
                        {!isRead(n.id) && <span className="notif-unread-dot" />}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        <div className="navbar-divider" />

        <div className="navbar-user">
          <div className="navbar-user-info">
            <span className="navbar-user-name">{user?.firstName} {user?.lastName}</span>
            <span className="navbar-user-role" style={rolePill}>{user?.role}</span>
          </div>
          <div className="navbar-user-avatar">{initials}</div>
        </div>

        <button
          className="navbar-icon-btn navbar-logout"
          onClick={logout}
          title="Sign out"
          aria-label="Sign out"
        >
          <FiLogOut size={16} />
        </button>

      </div>
    </header>
  );
}
