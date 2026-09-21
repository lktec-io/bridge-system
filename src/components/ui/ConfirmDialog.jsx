import Modal from './Modal';

export default function ConfirmDialog({
  open, onClose, onConfirm,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed? This cannot be undone.',
  confirmLabel = 'Confirm',
  confirmVariant = 'btn-danger',
  loading = false,
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose} disabled={loading}>Cancel</button>
          <button className={`btn ${confirmVariant}`} onClick={onConfirm} disabled={loading}>
            {loading ? 'Please wait...' : confirmLabel}
          </button>
        </>
      }
    >
      <p style={{ fontSize: 'var(--fs-base)', color: 'var(--text-muted)', lineHeight: 'var(--lh-base)' }}>
        {message}
      </p>
    </Modal>
  );
}
