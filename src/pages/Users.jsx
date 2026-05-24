import { useEffect, useState } from 'react';
import { authAPI } from '../api/auth';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';
import { MdPeople, MdEdit, MdCheckCircle, MdDelete, MdErrorOutline, MdClose } from 'react-icons/md';
import { RoleBadge } from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';

const safeDate = (d, fmt) => {
  if (!d) return '—';
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? '—' : format(dt, fmt);
};

export default function Users() {
  const { user: currentUser } = useAuth();
  const [users,       setUsers]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [editTarget,  setEditTarget]  = useState(null);
  const [newRole,     setNewRole]     = useState('');
  const [saving,      setSaving]      = useState(false);
  const [deleteTarget,setDeleteTarget]= useState(null);
  const [deleting,    setDeleting]    = useState(false);
  const [error,       setError]       = useState('');

  const fetchUsers = async () => {
    try {
      const { data } = await authAPI.getAllUsers();
      setUsers(data);
    } catch { setUsers([]); }
    finally  { setLoading(false); }
  };

  useEffect(() => { fetchUsers(); }, []);

  const openEdit = (u) => { setEditTarget(u); setNewRole(u.role); };
  const closeEdit = () => setEditTarget(null);

  const handleRoleUpdate = async () => {
    setSaving(true);
    try {
      await authAPI.updateUserRole(editTarget.id, newRole);
      setUsers((prev) => prev.map((u) => u.id === editTarget.id ? { ...u, role: newRole } : u));
      closeEdit();
    } catch { setError('Failed to update role'); closeEdit(); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await authAPI.deleteUser(deleteTarget.id);
      setUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete user');
    } finally { setDeleting(false); }
  };

  if (loading) return <div className="loading-center"><div className="spinner" /><span>Loading users...</span></div>;

  return (
    <div>
      {error && (
        <div className="alert alert-error" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <MdErrorOutline />
          <span style={{ flex: 1 }}>{error}</span>
          <button className="btn-close" onClick={() => setError('')}><MdClose size={18} /></button>
        </div>
      )}
      <div className="page-header">
        <div>
          <h2>System Users</h2>
          <p>{users.length} user(s) registered</p>
        </div>
      </div>

      {users.length === 0 ? (
        <div className="card">
          <div className="empty-state" style={{ padding: '60px 24px' }}>
            <MdPeople />
            <h3>No users found</h3>
          </div>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="table-wrapper users-desktop-table">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Registered</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td style={{ fontWeight: 600 }}>
                      {u.firstName} {u.lastName}
                      {u.id === currentUser?.id && (
                        <span style={{ fontSize: 11, marginLeft: 6, background: 'var(--primary-light)', color: 'var(--primary)', padding: '1px 6px', borderRadius: 99, fontWeight: 700 }}>
                          You
                        </span>
                      )}
                    </td>
                    <td className="muted">{u.email}</td>
                    <td><RoleBadge role={u.role} /></td>
                    <td className="muted">{safeDate(u.createdAt, 'dd MMM yyyy')}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                        <button
                          className="btn btn-ghost btn-sm btn-icon"
                          title="Change Role"
                          onClick={() => openEdit(u)}
                        >
                          <MdEdit />
                        </button>
                        {u.id !== currentUser?.id && (
                          <button
                            className="btn btn-danger btn-sm btn-icon"
                            title="Delete User"
                            onClick={() => setDeleteTarget({ id: u.id, name: `${u.firstName} ${u.lastName}` })}
                          >
                            <MdDelete />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="users-mobile-cards">
            {users.map((u) => (
              <div key={u.id} className="user-card">
                <div className="user-card-top">
                  <div className="user-card-avatar">
                    {u.firstName?.[0]}{u.lastName?.[0]}
                  </div>
                  <div className="user-card-info">
                    <div className="user-card-name">
                      {u.firstName} {u.lastName}
                      {u.id === currentUser?.id && (
                        <span className="you-chip">You</span>
                      )}
                    </div>
                    <div className="user-card-email">{u.email}</div>
                  </div>
                </div>
                <div className="user-card-meta">
                  <RoleBadge role={u.role} />
                  <span className="user-card-date">Joined {safeDate(u.createdAt, 'dd MMM yyyy')}</span>
                </div>
                <div className="user-card-actions">
                  <button className="btn btn-ghost btn-sm" onClick={() => openEdit(u)}>
                    <MdEdit /> Change Role
                  </button>
                  {u.id !== currentUser?.id && (
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => setDeleteTarget({ id: u.id, name: `${u.firstName} ${u.lastName}` })}
                    >
                      <MdDelete /> Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── Change Role Modal ─────────────────────────────── */}
      <Modal
        open={Boolean(editTarget)}
        onClose={closeEdit}
        title="Change User Role"
        footer={
          <>
            <button className="btn btn-secondary" onClick={closeEdit} disabled={saving}>Cancel</button>
            <button className="btn btn-primary" onClick={handleRoleUpdate} disabled={saving}>
              {saving ? 'Saving...' : <><MdCheckCircle /> Update Role</>}
            </button>
          </>
        }
      >
        {editTarget && (
          <div>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
              Changing role for <strong>{editTarget.firstName} {editTarget.lastName}</strong>
            </p>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="role-select">Select Role</label>
              <select
                id="role-select"
                className="form-control"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
              >
                <option value="ENGINEER">Engineer</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Delete Confirm ────────────────────────────────── */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete User"
        message={`Delete ${deleteTarget?.name ?? 'this user'}? This action cannot be undone.`}
        confirmLabel="Delete User"
        loading={deleting}
      />
    </div>
  );
}
