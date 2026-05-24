import { NavLink } from 'react-router-dom';
import { FiGrid, FiDatabase, FiFileText, FiUsers, FiMap, FiX } from 'react-icons/fi';
import { MdDomain } from 'react-icons/md';
import { useAuth } from '../../context/AuthContext';

const NAV_MAIN = [
  { to: '/dashboard',   icon: FiGrid,     label: 'Dashboard',   end: true  },
  { to: '/bridges',     icon: FiDatabase, label: 'Bridges',     end: false },
  { to: '/inspections', icon: FiFileText, label: 'Inspections', end: true  },
  { to: '/map',         icon: FiMap,      label: 'Bridge Map',  end: true  },
];

const NAV_ADMIN = [
  { to: '/users', icon: FiUsers, label: 'Users', end: true },
];

export default function Sidebar({ open, onClose }) {
  const { user, isAdmin } = useAuth();

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

        {/* Logo */}
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">
            <MdDomain size={19} color="#fff" />
          </div>
          <div className="sidebar-logo-text">
            <h1>BMS</h1>
            <span>Bridge Information System</span>
          </div>
          <button className="sidebar-close-btn" onClick={onClose} aria-label="Close sidebar">
            <FiX size={17} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">

          <span className="nav-section-title">Main</span>

          {NAV_MAIN.map(({ to, icon: Icon, label, end }, i) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
              onClick={onClose}
              style={{ '--nav-i': i }}
            >
              <Icon size={16} />
              <span>{label}</span>
            </NavLink>
          ))}

          {isAdmin && (
            <>
              <span className="nav-section-title" style={{ marginTop: 20 }}>
                Administration
              </span>
              {NAV_ADMIN.map(({ to, icon: Icon, label, end }, i) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
                  onClick={onClose}
                  style={{ '--nav-i': NAV_MAIN.length + i + 1 }}
                >
                  <Icon size={16} />
                  <span>{label}</span>
                </NavLink>
              ))}
            </>
          )}
        </nav>

        {/* User card */}
        <div className="sidebar-footer">
          <div className="user-card">
            <div className="user-avatar">{initials}</div>
            <div className="user-info">
              <strong>{user?.firstName} {user?.lastName}</strong>
              <span>{user?.role?.toLowerCase()}</span>
            </div>
          </div>
        </div>

      </aside>
    </>
  );
}
