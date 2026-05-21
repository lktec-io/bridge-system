import { NavLink } from 'react-router-dom';
import {
  MdDashboard, MdAccountBalance, MdList, MdAddBox,
  MdPeople, MdLogout, MdClose, MdDomain,
} from 'react-icons/md';
import { useAuth } from '../../context/AuthContext';

const NAV_MAIN = [
  { to: '/dashboard', icon: MdDashboard,      label: 'Dashboard'   },
  { to: '/bridges',   icon: MdAccountBalance, label: 'Bridges'     },
  { to: '/bridges/new', icon: MdAddBox,       label: 'Add Bridge'  },
  { to: '/inspections', icon: MdList,         label: 'Inspections' },
];

const NAV_ADMIN = [
  { to: '/users', icon: MdPeople, label: 'Users' },
];

export default function Sidebar({ open, onClose }) {
  const { user, logout, isAdmin } = useAuth();

  const initials = user
    ? `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase()
    : '?';

  return (
    <>
      <div
        className={`sidebar-overlay${open ? ' open' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside className={`sidebar${open ? ' open' : ''}`} aria-label="Main navigation">

        {/* ── Logo ──────────────────────────────────────────── */}
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon"><MdDomain size={20} color="#fff" /></div>
          <div className="sidebar-logo-text">
            <h1>BMS</h1>
            <span>Bridge Mgmt System</span>
          </div>
          <button className="sidebar-close-btn" onClick={onClose} aria-label="Close sidebar">
            <MdClose size={18} />
          </button>
        </div>

        {/* ── Navigation ────────────────────────────────────── */}
        <nav className="sidebar-nav">
          <span className="nav-section-title">Main</span>

          {NAV_MAIN.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
              onClick={onClose}
            >
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}

          {isAdmin && (
            <>
              <span className="nav-section-title" style={{ marginTop: 16 }}>
                Administration
              </span>
              {NAV_ADMIN.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
                  onClick={onClose}
                >
                  <Icon size={18} />
                  <span>{label}</span>
                </NavLink>
              ))}
            </>
          )}
        </nav>

        {/* ── User card ─────────────────────────────────────── */}
        <div className="sidebar-footer">
          <div className="user-card">
            <div className="user-avatar">{initials}</div>
            <div className="user-info">
              <strong>{user?.firstName} {user?.lastName}</strong>
              <span>{user?.role?.toLowerCase()}</span>
            </div>
            <button className="btn-logout" onClick={logout} title="Sign out" aria-label="Sign out">
              <MdLogout size={18} />
            </button>
          </div>
        </div>

      </aside>
    </>
  );
}
