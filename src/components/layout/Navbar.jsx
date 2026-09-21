import { useRef, useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  FiMenu, FiX, FiBell, FiLogOut, FiSun, FiMoon, FiSearch,
  FiAlertCircle, FiAlertTriangle, FiInfo, FiCheck, FiActivity,
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
  danger:  <FiAlertCircle   size={14} />,
  warning: <FiAlertTriangle size={14} />,
  info:    <FiInfo          size={14} />,
};

/* Backend emits domain event types; map them to a severity channel. */
const SEVERITY = {
  INSPECTION_POOR:     'danger',
  BRIDGE_DELETED:      'danger',
  SENSOR_THRESHOLD:    'danger',
  MAINTENANCE_OVERDUE: 'warning',
  INSPECTION_OVERDUE:  'warning',
  INSPECTION_RESOLVED: 'info',
  BRIDGE_CREATED:      'info',
  MAINTENANCE_LOGGED:  'info',
};

const severityOf = (n) =>
  SEVERITY[n.type] ?? (['danger', 'warning', 'info'].includes(n.type) ? n.type : 'info');

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
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { notifications, unreadCount, markAllRead, markRead, isRead } = useNotifications();
  const { title, subtitle } = resolvePageMeta(pathname);

  const [notifOpen, setNotifOpen] = useState(false);
  const [query, setQuery] = useState('');
  const notifRef  = useRef(null);
  const searchRef = useRef(null);

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

  useEffect(() => {
    if (!notifOpen) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setNotifOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [notifOpen]);

  /* "/" focuses the search, the way a terminal operator expects. Ignored while
     the caret is already in a field so it never eats a typed slash. */
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== '/' || e.metaKey || e.ctrlKey) return;
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      e.preventDefault();
      searchRef.current?.focus();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const submitSearch = (e) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    // Hands the term to the inventory's server-side search
    navigate(`/bridges?search=${encodeURIComponent(q)}`);
    searchRef.current?.blur();
  };

  /* System health reflects unread signals: a critical event type outranks a
     plain backlog, and no unread signals reads as nominal. */
  const health = useMemo(() => {
    const unread = notifications.filter((n) => !isRead(n.id));
    if (unread.some((n) => severityOf(n) === 'danger')) {
      return { cls: 'crit', label: `${unread.length} critical` };
    }
    if (unread.length > 0) return { cls: 'warn', label: `${unread.length} signal${unread.length === 1 ? '' : 's'}` };
    return { cls: 'ok', label: 'Nominal' };
  }, [notifications, isRead]);

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
          {sidebarOpen ? <FiX size={21} /> : <FiMenu size={21} />}
        </button>

        <div style={{ minWidth: 0 }}>
          <div className="topbar-title">{title}</div>
          {subtitle && <div className="topbar-subtitle">{subtitle}</div>}
        </div>

        <form className="topbar-search" onSubmit={submitSearch} role="search">
          <FiSearch size={16} />
          <input
            ref={searchRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search structures…"
            aria-label="Search structures"
          />
          {!query && <kbd>/</kbd>}
        </form>
      </div>

      <div className="topbar-right">

        <span className={`health-pill ${health.cls}`} title="System health">
          <FiActivity size={13} />
          {health.label}
        </span>

        <button
          className="navbar-icon-btn"
          onClick={toggleTheme}
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDark ? <FiSun size={18} /> : <FiMoon size={18} />}
        </button>

        <div className="notif-wrapper" ref={notifRef}>
          <button
            className={`navbar-icon-btn navbar-bell${notifOpen ? ' notif-btn-active' : ''}`}
            onClick={() => setNotifOpen((v) => !v)}
            title="Structural health signals"
            aria-label="Notifications"
            aria-expanded={notifOpen}
          >
            <FiBell size={18} />
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
                    <FiCheck size={12} /> Mark all read
                  </button>
                )}
              </div>

              <div className="notif-list">
                {notifications.length === 0 ? (
                  <div className="notif-empty">
                    <FiBell size={26} style={{ opacity: .25 }} />
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
          <FiLogOut size={18} />
        </button>

      </div>
    </header>
  );
}
