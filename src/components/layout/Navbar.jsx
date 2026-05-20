import { useLocation } from 'react-router-dom';
import { MdMenu } from 'react-icons/md';
import { useAuth } from '../../context/AuthContext';

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

  return { title: 'Bridge Management System', subtitle: '' };
}

export default function Navbar({ onMenuClick }) {
  const { pathname } = useLocation();
  const { user } = useAuth();
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

      {/* ── Left: hamburger + page title ──────────────────── */}
      <div className="topbar-left">
        <button className="hamburger" onClick={onMenuClick} aria-label="Toggle sidebar">
          <MdMenu size={22} />
        </button>
        <div>
          <div className="topbar-title">{title}</div>
          {subtitle && <div className="topbar-subtitle">{subtitle}</div>}
        </div>
      </div>

      {/* ── Right: user info ──────────────────────────────── */}
      <div className="topbar-right">
        <div className="navbar-user">
          <div className="navbar-user-info">
            <span className="navbar-user-name">
              {user?.firstName} {user?.lastName}
            </span>
            <span className="navbar-user-role" style={rolePill}>
              {user?.role}
            </span>
          </div>
          <div className="navbar-user-avatar" title={`${user?.firstName} ${user?.lastName}`}>
            {initials}
          </div>
        </div>
      </div>

    </header>
  );
}
