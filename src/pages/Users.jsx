import { useEffect, useState } from 'react';
import { authAPI } from '../api/auth';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';
import { MdPeople, MdEdit, MdCheckCircle, MdDelete } from 'react-icons/md';
import { RoleBadge } from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';

export default function Users() {
  const { user: currentUser } = useAuth();
  const [users,       setUsers]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [editTarget,  setEditTarget]  = useState(null);   // { id, role }
  const [newRole,     setNewRole]     = useState('');
  const [saving,      setSaving]      = useState(false);
  const [deleteTarget,setDeleteTarget]= useState(null);   // { id, name }
  const [deleting,    setDeleting]    = useState(false);

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
    } catch { alert('Failed to update role'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await authAPI.deleteUser(deleteTarget.id);
      setUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete user');
    } finally { setDeleting(false); }
  };

  if (loading) return <div className="loading-center"><div className="spinner" /><span>Loading users...</span></div>;

  return (
    <div>
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
        <div className="table-wrapper">
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
                  <td className="muted">{format(new Date(u.createdAt), 'dd MMM yyyy')}</td>
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
