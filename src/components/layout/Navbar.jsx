import { useLocation } from 'react-router-dom';
import { FiMenu, FiX, FiBell, FiLogOut, FiSun, FiMoon } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

const ROUTE_META = {
  '/dashboard':    { title: 'Dashboard',        subtitle: 'System overview and key statistics' },
  '/bridges':      { title: 'Bridge Registry',   subtitle: 'All registered bridge records' },
  '/bridges/new':  { title: 'Register Bridge',   subtitle: 'Add a new bridge to the registry' },
  '/inspections':  { title: 'Inspections',        subtitle: 'All inspection records across bridges' },
  '/users':        { title: 'User Management',    subtitle: 'Manage system users and access roles' },
};

function resolvePageMeta(pathname) {
  const exact = ROUTE_META[pathname];
  if (exact) return exact;

  if (pathname.includes('/inspections/new'))
    return { title: 'New Inspection',   subtitle: 'Record a new field inspection' };
  if (/\/inspections\/\d+\/edit/.test(pathname))
    return { title: 'Edit Inspection',  subtitle: 'Update inspection record' };
  if (pathname.includes('/edit'))
    return { title: 'Edit Bridge',      subtitle: 'Update bridge information' };
  if (/\/bridges\/\d+$/.test(pathname))
    return { title: 'Bridge Profile',   subtitle: 'Full bridge record and inspection history' };

  return { title: 'Bridge Information System', subtitle: 'BMS — Infrastructure Asset Management' };
}

export default function Navbar({ onMenuClick, sidebarOpen }) {
  const { pathname } = useLocation();
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { title, subtitle } = resolvePageMeta(pathname);

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

        {/* Notifications */}
        <button className="navbar-icon-btn navbar-bell" title="Notifications" aria-label="Notifications">
          <FiBell size={17} />
          <span className="bell-dot" />
        </button>

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
