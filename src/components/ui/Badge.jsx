const CONDITION_MAP = {
  GOOD: 'badge-good',
  FAIR: 'badge-fair',
  POOR: 'badge-poor',
};

const ROLE_MAP = {
  ADMIN:    'badge-admin',
  ENGINEER: 'badge-engineer',
};

export function ConditionBadge({ status }) {
  if (!status) return <span className="badge" style={{ background: '#f8fafc', color: 'var(--text-light)' }}>Not inspected</span>;
  return <span className={`badge ${CONDITION_MAP[status] ?? ''}`}>{status}</span>;
}

export function RoleBadge({ role }) {
  return <span className={`badge ${ROLE_MAP[role] ?? ''}`}>{role}</span>;
}

export default function Badge({ children, variant = 'default', className = '', style = {} }) {
  const variantClass = {
    default: '',
    good:    'badge-good',
    fair:    'badge-fair',
    poor:    'badge-poor',
    admin:   'badge-admin',
    engineer:'badge-engineer',
  }[variant] ?? '';

  return (
    <span className={`badge ${variantClass} ${className}`} style={style}>
      {children}
    </span>
  );
}
