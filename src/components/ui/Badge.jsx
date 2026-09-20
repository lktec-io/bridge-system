const CONDITION_MAP = {
  GOOD: 'badge-good',
  FAIR: 'badge-fair',
  POOR: 'badge-poor',
};

const ROLE_MAP = {
  ADMIN:    'badge-admin',
  ENGINEER: 'badge-engineer',
};

/** Condition rating chip. An absent rating is stated, never implied as healthy. */
export function ConditionBadge({ status }) {
  if (!status || status === 'UNINSPECTED') {
    return <span className="badge badge-none">Uninspected</span>;
  }
  return <span className={`badge ${CONDITION_MAP[status] ?? 'badge-none'}`}>{status}</span>;
}

export function RoleBadge({ role }) {
  return <span className={`badge ${ROLE_MAP[role] ?? 'badge-none'}`}>{role}</span>;
}

export default function Badge({ children, variant = 'default', className = '', style = {} }) {
  const variantClass = {
    default:  'badge-none',
    good:     'badge-good',
    fair:     'badge-fair',
    poor:     'badge-poor',
    admin:    'badge-admin',
    engineer: 'badge-engineer',
  }[variant] ?? '';

  return (
    <span className={`badge ${variantClass} ${className}`} style={style}>
      {children}
    </span>
  );
}
