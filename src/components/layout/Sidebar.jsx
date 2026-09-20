import { NavLink } from 'react-router-dom';
import {
  FiGrid, FiDatabase, FiClipboard, FiTool, FiActivity,
  FiAlertTriangle, FiMap, FiUsers, FiFileText, FiX, FiLogOut,
} from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';

/* Navigation is grouped by operational function, not by CRUD entity. */
const NAV_GROUPS = [
  {
    title: 'Operations',
    items: [
      { to: '/dashboard',   icon: FiGrid,      label: 'Dashboard',            end: true  },
      { to: '/bridges',     icon: FiDatabase,  label: 'Bridge Inventory',     end: false },
      { to: '/inspections', icon: FiClipboard, label: 'Inspection Logs',      end: true  },
      { to: '/maintenance', icon: FiTool,      label: 'Maintenance Schedules', end: true },
    ],
  },
  {
    title: 'Monitoring',
    items: [
      { to: '/sensors', icon: FiActivity,      label: 'Sensor / IoT Analytics', end: true },
      { to: '/alerts',  icon: FiAlertTriangle, label: 'Structural Health Alerts', end: true, badgeKey: 'alerts' },
      { to: '/map',     icon: FiMap,           label: 'GIS Bridge Map',         end: true },
    ],
  },
];

/* System Logs is read-only and available to every operator — an audit trail
   only deters if the people doing the work can see it. */
const NAV_RECORDS = {
  title: 'Records',
  items: [
    { to: '/logs', icon: FiFileText, label: 'System Logs', end: true },
  ],
};

const NAV_ADMIN = {
  title: 'Administration',
  items: [
    { to: '/users', icon: FiUsers, label: 'System Admin', end: true },
  ],
};

export default function Sidebar({ open, onClose }) {
  const { user, isAdmin, logout } = useAuth();
  const { unreadCount } = useNotifications();

  const initials = user
    ? `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase()
    : '?';

  const groups = isAdmin
    ? [...NAV_GROUPS, NAV_RECORDS, NAV_ADMIN]
    : [...NAV_GROUPS, NAV_RECORDS];
  let rowIndex = 0;

  const badgeFor = (key) => {
    if (key === 'alerts' && unreadCount > 0) return unreadCount > 99 ? '99+' : unreadCount;
    return null;
  };

  return (
    <>
      <div
        className={`sidebar-overlay${open ? ' open' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside className={`sidebar${open ? ' open' : ''}`} aria-label="Main navigation">

        {/* Identity block */}
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon" aria-hidden="true">
            {/* Bridge span mark — deliberately geometric */}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.1" strokeLinecap="square">
              <path d="M2 17h20" />
              <path d="M2 17V9" />
              <path d="M22 17V9" />
              <path d="M2 12c5-4 15-4 20 0" />
              <path d="M8 17v-3.2" />
              <path d="M16 17v-3.2" />
            </svg>
          </div>
          <div className="sidebar-logo-text">
            <h1>BMS</h1>
            <span>Infrastructure Terminal</span>
          </div>
          <button className="sidebar-close-btn" onClick={onClose} aria-label="Close navigation">
            <FiX size={16} />
          </button>
        </div>

        {/* Operational status strip */}
        <div className="sidebar-status">
          <span className={`status-dot${unreadCount > 0 ? ' warn' : ''}`} />
          <span>{unreadCount > 0 ? `${unreadCount} active signal(s)` : 'All systems nominal'}</span>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {groups.map(({ title, items }) => (
            <div key={title}>
              <span className="nav-section-title">{title}</span>
              {items.map(({ to, icon: Icon, label, end, badgeKey }) => {
                const badge = badgeKey ? badgeFor(badgeKey) : null;
                return (
                  <NavLink
                    key={to}
                    to={to}
                    end={end}
                    className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
                    onClick={onClose}
                    style={{ '--nav-i': rowIndex++ }}
                  >
                    <Icon size={15} />
                    <span>{label}</span>
                    {badge && <span className="nav-badge">{badge}</span>}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Operator card */}
        <div className="sidebar-footer">
          <div className="user-card">
            <div className="user-avatar">{initials}</div>
            <div className="user-info">
              <strong>{user?.firstName} {user?.lastName}</strong>
              <span>{user?.role}</span>
            </div>
            <button className="btn-logout" onClick={logout} title="Sign out" aria-label="Sign out">
              <FiLogOut size={15} />
            </button>
          </div>
        </div>

      </aside>
    </>
  );
}
