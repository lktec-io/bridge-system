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
  '/dashboard':    { title: 'Dashboard',        subtitle: 'System overview and key statistics' },
  '/bridges':      { title: 'Bridge Registry',   subtitle: 'All registered bridge records' },
  '/bridges/new':  { title: 'Register Bridge',   subtitle: 'Add a new bridge to the registry' },
  '/inspections':  { title: 'Inspections',        subtitle: 'All inspection records across bridges' },
  '/users':        { title: 'User Management',    subtitle: 'Manage system users and access roles' },
  '/map':          { title: 'Bridge Map',         subtitle: 'Geographic overview of all bridge assets' },
};

function resolvePageMeta(pathname) {
  const exact = ROUTE_META[pathname];
  if (exact) return exact;
  if (pathname.includes('/inspections/new'))
    return { title: 'New Inspection',  subtitle: 'Record a new field inspection' };
  if (/\/inspections\/\d+\/edit/.test(pathname))
    return { title: 'Edit Inspection', subtitle: 'Update inspection record' };
  if (pathname.includes('/edit'))
    return { title: 'Edit Bridge',     subtitle: 'Update bridge information' };
  if (/\/bridges\/\d+$/.test(pathname))
    return { title: 'Bridge Profile',  subtitle: 'Full bridge record and inspection history' };
  return { title: 'Bridge Information System', subtitle: 'BMS — Infrastructure Asset Management' };
}

const NOTIF_ICON = {
  danger:  <FiAlertCircle  size={14} />,
  warning: <FiAlertTriangle size={14} />,
  info:    <FiInfo          size={14} />,
};

const NOTIF_COLOR = {
  danger:  'var(--danger)',
  warning: 'var(--warning)',
  info:    'var(--primary)',
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
  const { notifications, unreadCount, markAllRead, isRead } = useNotifications();
  const { title, subtitle } = resolvePageMeta(pathname);

  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const initials = user
    ? `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase()
    : '?';

  const rolePill =
    user?.role === 'ADMIN'
      ? { background: 'var(--primary-light)', color: 'var(--primary)' }
      : { background: '#f0fdf4', color: '#166534' };

  return (
    <header className="topbar">

      {/* Left: hamburger + page title */}
      <div className="topbar-left">
        <button className="hamburger" onClick={onMenuClick} aria-label="Toggle sidebar">
          {sidebarOpen ? <FiX size={20} /> : <FiMenu size={20} />}
        </button>
        <div>
          <div className="topbar-title">{title}</div>
          {subtitle && <div className="topbar-subtitle">{subtitle}</div>}
        </div>
      </div>

      {/* Right: controls */}
      <div className="topbar-right">

        {/* Theme toggle */}
        <button
          className="navbar-icon-btn"
          onClick={toggleTheme}
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDark ? <FiSun size={17} /> : <FiMoon size={17} />}
        </button>

        {/* Notification bell with dropdown */}
        <div className="notif-wrapper" ref={notifRef}>
          <button
            className={`navbar-icon-btn navbar-bell${notifOpen ? ' notif-btn-active' : ''}`}
            onClick={() => setNotifOpen((v) => !v)}
            title="Notifications"
            aria-label="Notifications"
          >
            <FiBell size={17} />
            {unreadCount > 0 && (
              <span className="bell-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
            )}
          </button>

          {notifOpen && (
            <div className="notif-dropdown">
              <div className="notif-dropdown-header">
                <span className="notif-dropdown-title">
                  Notifications
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
                    <FiBell size={24} style={{ opacity: .25 }} />
                    <span>No notifications</span>
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`notif-item${isRead(n.id) ? ' notif-read' : ''}`}
                    >
                      <div className="notif-item-icon" style={{ color: NOTIF_COLOR[n.type] }}>
                        {NOTIF_ICON[n.type]}
                      </div>
                      <div className="notif-item-body">
                        <div className="notif-item-title">{n.title}</div>
                        <div className="notif-item-msg">{n.message}</div>
                        <div className="notif-item-time">{timeAgo(n.ts)}</div>
                      </div>
                      {!isRead(n.id) && <span className="notif-unread-dot" />}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="navbar-divider" />

        {/* User info */}
        <div className="navbar-user">
          <div className="navbar-user-info">
            <span className="navbar-user-name">
              {user?.firstName} {user?.lastName}
            </span>
            <span className="navbar-user-role" style={rolePill}>
              {user?.role}
            </span>
          </div>
          <div className="navbar-user-avatar">{initials}</div>
        </div>

        {/* Logout */}
        <button
          className="navbar-icon-btn navbar-logout"
          onClick={logout}
          title="Sign out"
          aria-label="Sign out"
        >
          <FiLogOut size={17} />
        </button>

      </div>
    </header>
  );
}
