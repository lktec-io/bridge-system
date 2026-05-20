import { format, formatDistanceToNow } from 'date-fns';

export const fmtDate    = (d) => d ? format(new Date(d), 'dd MMM yyyy') : '—';
export const fmtDateLong= (d) => d ? format(new Date(d), 'dd MMMM yyyy') : '—';
export const fmtDateTime= (d) => d ? format(new Date(d), 'dd MMM yyyy, HH:mm') : '—';
export const fmtAgo     = (d) => d ? formatDistanceToNow(new Date(d), { addSuffix: true }) : '—';
export const fmtKm      = (n) => n != null ? Number(n).toFixed(3) : '—';

export const conditionClass = (s) => ({ GOOD: 'good', FAIR: 'fair', POOR: 'poor' })[s] ?? 'none';
export const conditionBadgeClass = (s) => ({ GOOD: 'badge-good', FAIR: 'badge-fair', POOR: 'badge-poor' })[s] ?? '';
