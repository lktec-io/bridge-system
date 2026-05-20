import { MdInbox } from 'react-icons/md';

export default function EmptyState({ icon, title, message, action }) {
  const Icon = icon ?? MdInbox;
  return (
    <div className="empty-state">
      <Icon />
      {title   && <h3>{title}</h3>}
      {message && <p>{message}</p>}
      {action}
    </div>
  );
}
