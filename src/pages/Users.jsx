import { useEffect, useState } from 'react';
import { authAPI } from '../api/auth';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';
import {
  FiUsers, FiUserPlus, FiEdit2, FiTrash2, FiLock,
  FiX, FiCheck, FiAlertCircle, FiEye, FiEyeOff,
} from 'react-icons/fi';
import { RoleBadge } from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';

const safeDate = (d, fmt) => {
  if (!d) return '—';
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? '—' : format(dt, fmt);
};

const EMPTY_ADD  = { firstName: '', lastName: '', email: '', password: '', confirmPassword: '', role: 'ENGINEER' };
const EMPTY_EDIT = { firstName: '', lastName: '', email: '', role: 'ENGINEER' };
const EMPTY_PWD  = { newPassword: '', confirmPassword: '' };

function UserAvatar({ u }) {
  return (
    <div className="user-avatar-circle">
      {(u.firstName?.[0] ?? '').toUpperCase()}{(u.lastName?.[0] ?? '').toUpperCase()}
    </div>
  );
}

export default function Users() {
  const { user: currentUser } = useAuth();

  const [users,        setUsers]        = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [globalError,  setGlobalError]  = useState('');

  // Add modal
  const [addOpen,      setAddOpen]      = useState(false);
  const [addForm,      setAddForm]      = useState(EMPTY_ADD);
  const [addError,     setAddError]     = useState('');
  const [addSaving,    setAddSaving]    = useState(false);
  const [showAddPwd,   setShowAddPwd]   = useState(false);
  const [showAddCfm,   setShowAddCfm]   = useState(false);

  // Edit modal
  const [editTarget,   setEditTarget]   = useState(null);
  const [editForm,     setEditForm]     = useState(EMPTY_EDIT);
  const [editError,    setEditError]    = useState('');
  const [editSaving,   setEditSaving]   = useState(false);

  // Password modal
  const [pwdTarget,    setPwdTarget]    = useState(null);
  const [pwdForm,      setPwdForm]      = useState(EMPTY_PWD);
  const [pwdError,     setPwdError]     = useState('');
  const [pwdSaving,    setPwdSaving]    = useState(false);
  const [showPwd,      setShowPwd]      = useState(false);
  const [showCfm,      setShowCfm]      = useState(false);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting,     setDeleting]     = useState(false);

  const fetchUsers = async () => {
    try {
      const { data } = await authAPI.getAllUsers();
      setUsers(data);
    } catch { setUsers([]); }
    finally  { setLoading(false); }
  };

  useEffect(() => { fetchUsers(); }, []);

  // ── Add user ─────────────────────────────────────────────────
  const openAdd = () => { setAddForm(EMPTY_ADD); setAddError(''); setShowAddPwd(false); setShowAddCfm(false); setAddOpen(true); };
  const closeAdd = () => { setAddOpen(false); setAddError(''); };

  const handleAdd = async () => {
    const { firstName, lastName, email, password, confirmPassword, role } = addForm;
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password) {
      setAddError('All fields are required'); return;
    }
    if (password.length < 6) {
      setAddError('Password must be at least 6 characters'); return;
    }
    if (password !== confirmPassword) {
      setAddError('Passwords do not match'); return;
    }
    setAddSaving(true); setAddError('');
    try {
      const { data } = await authAPI.createUser({ firstName, lastName, email, password, role });
      setUsers((prev) => [data, ...prev]);
      closeAdd();
    } catch (err) {
      setAddError(err.response?.data?.message || 'Failed to create user');
    } finally { setAddSaving(false); }
  };

  // ── Edit user ─────────────────────────────────────────────────
  const openEdit = (u) => {
    setEditTarget(u);
    setEditForm({ firstName: u.firstName, lastName: u.lastName, email: u.email, role: u.role });
    setEditError('');
  };
  const closeEdit = () => { setEditTarget(null); setEditError(''); };

  const handleEdit = async () => {
    const { firstName, lastName, email, role } = editForm;
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      setEditError('First name, last name and email are required'); return;
    }
    setEditSaving(true); setEditError('');
    try {
      const { data } = await authAPI.updateUser(editTarget.id, { firstName, lastName, email, role });
      setUsers((prev) => prev.map((u) => u.id === editTarget.id ? data : u));
      closeEdit();
    } catch (err) {
      setEditError(err.response?.data?.message || 'Failed to update user');
    } finally { setEditSaving(false); }
  };

  // ── Change password ───────────────────────────────────────────
  const openPwd = (u) => { setPwdTarget(u); setPwdForm(EMPTY_PWD); setPwdError(''); setShowPwd(false); setShowCfm(false); };
  const closePwd = () => { setPwdTarget(null); setPwdError(''); };

  const handlePwd = async () => {
    const { newPassword, confirmPassword } = pwdForm;
    if (!newPassword || !confirmPassword) {
      setPwdError('Both fields are required'); return;
    }
    if (newPassword.length < 6) {
      setPwdError('Password must be at least 6 characters'); return;
    }
    if (newPassword !== confirmPassword) {
      setPwdError('Passwords do not match'); return;
    }
    setPwdSaving(true); setPwdError('');
    try {
      await authAPI.changePassword(pwdTarget.id, { newPassword, confirmPassword });
      closePwd();
    } catch (err) {
      setPwdError(err.response?.data?.message || 'Failed to change password');
    } finally { setPwdSaving(false); }
  };

  // ── Delete ────────────────────────────────────────────────────
  const handleDelete = async () => {
    setDeleting(true);
    try {
      await authAPI.deleteUser(deleteTarget.id);
      setUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      setGlobalError(err.response?.data?.message || 'Failed to delete user');
      setDeleteTarget(null);
    } finally { setDeleting(false); }
  };

  if (loading) return <div className="loading-center"><div className="spinner" /><span>Loading users...</span></div>;

  return (
    <div>
      {globalError && (
        <div className="alert alert-error" style={{ marginBottom: 16 }}>
          <FiAlertCircle size={16} />
          <span style={{ flex: 1 }}>{globalError}</span>
          <button className="btn-icon-bare" onClick={() => setGlobalError('')}><FiX size={16} /></button>
        </div>
      )}

      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <FiUsers size={22} style={{ color: 'var(--primary)' }} />
          <div>
            <h2>System Users</h2>
            <p>{users.length} user(s) registered</p>
          </div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={openAdd}>
          <FiUserPlus size={15} /> Add User
        </button>
      </div>

      {users.length === 0 ? (
        <div className="card">
          <div className="empty-state" style={{ padding: '60px 24px' }}>
            <FiUsers size={42} style={{ opacity: .25 }} />
            <h3>No users found</h3>
            <button className="btn btn-primary btn-sm" onClick={openAdd}>
              <FiUserPlus size={14} /> Add First User
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* ── Desktop table ─────────────────────────────── */}
          <div className="table-wrapper users-desktop-table">
            <table className="table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Registered</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <UserAvatar u={u} />
                        <span style={{ fontWeight: 600 }}>
                          {u.firstName} {u.lastName}
                          {u.id === currentUser?.id && (
                            <span className="you-chip" style={{ marginLeft: 6 }}>You</span>
                          )}
                        </span>
                      </div>
                    </td>
                    <td className="muted">{u.email}</td>
                    <td><RoleBadge role={u.role} /></td>
                    <td className="muted">{safeDate(u.createdAt, 'dd MMM yyyy')}</td>
                    <td>
                      <div className="users-action-group">
                        <button className="btn btn-ghost btn-sm btn-icon" title="Edit user" onClick={() => openEdit(u)}>
                          <FiEdit2 size={14} />
                        </button>
                        <button className="btn btn-ghost btn-sm btn-icon" title="Change password" onClick={() => openPwd(u)}>
                          <FiLock size={14} />
                        </button>
                        {u.id !== currentUser?.id && (
                          <button
                            className="btn btn-danger btn-sm btn-icon"
                            title="Delete user"
                            onClick={() => setDeleteTarget({ id: u.id, name: `${u.firstName} ${u.lastName}` })}
                          >
                            <FiTrash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── Mobile cards ──────────────────────────────── */}
          <div className="users-mobile-cards">
            {users.map((u) => (
              <div key={u.id} className="user-card">
                <div className="user-card-top">
                  <UserAvatar u={u} />
                  <div className="user-card-info">
                    <div className="user-card-name">
                      {u.firstName} {u.lastName}
                      {u.id === currentUser?.id && <span className="you-chip">You</span>}
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
                    <FiEdit2 size={13} /> Edit
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => openPwd(u)}>
                    <FiLock size={13} /> Password
                  </button>
                  {u.id !== currentUser?.id && (
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => setDeleteTarget({ id: u.id, name: `${u.firstName} ${u.lastName}` })}
                    >
                      <FiTrash2 size={13} /> Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── Add User Modal ────────────────────────────────────── */}
      <Modal
        open={addOpen}
        onClose={closeAdd}
        title="Add New User"
        footer={
          <>
            <button className="btn btn-secondary" onClick={closeAdd} disabled={addSaving}>Cancel</button>
            <button className="btn btn-primary" onClick={handleAdd} disabled={addSaving}>
              {addSaving ? <><span className="spinner spinner-sm" /> Creating…</> : <><FiCheck size={14} /> Create User</>}
            </button>
          </>
        }
      >
        {addError && (
          <div className="alert alert-error" style={{ marginBottom: 16 }}>
            <FiAlertCircle size={14} />
            <span>{addError}</span>
          </div>
        )}
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">First Name</label>
            <input
              className="form-control"
              placeholder="First name"
              value={addForm.firstName}
              onChange={(e) => setAddForm((f) => ({ ...f, firstName: e.target.value }))}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Last Name</label>
            <input
              className="form-control"
              placeholder="Last name"
              value={addForm.lastName}
              onChange={(e) => setAddForm((f) => ({ ...f, lastName: e.target.value }))}
            />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Email Address</label>
          <input
            className="form-control"
            type="email"
            placeholder="user@example.com"
            value={addForm.email}
            onChange={(e) => setAddForm((f) => ({ ...f, email: e.target.value }))}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Role</label>
          <select
            className="form-control"
            value={addForm.role}
            onChange={(e) => setAddForm((f) => ({ ...f, role: e.target.value }))}
          >
            <option value="ENGINEER">Engineer</option>
            <option value="ADMIN">Admin</option>
          </select>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Password</label>
            <div className="input-wrap">
              <input
                className="form-control"
                type={showAddPwd ? 'text' : 'password'}
                placeholder="Min. 6 characters"
                style={{ paddingRight: 44 }}
                value={addForm.password}
                onChange={(e) => setAddForm((f) => ({ ...f, password: e.target.value }))}
              />
              <button type="button" className="input-trailing-btn" tabIndex={-1} onClick={() => setShowAddPwd((v) => !v)}>
                {showAddPwd ? <FiEyeOff size={14} /> : <FiEye size={14} />}
              </button>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Confirm Password</label>
            <div className="input-wrap">
              <input
                className="form-control"
                type={showAddCfm ? 'text' : 'password'}
                placeholder="Repeat password"
                style={{ paddingRight: 44 }}
                value={addForm.confirmPassword}
                onChange={(e) => setAddForm((f) => ({ ...f, confirmPassword: e.target.value }))}
              />
              <button type="button" className="input-trailing-btn" tabIndex={-1} onClick={() => setShowAddCfm((v) => !v)}>
                {showAddCfm ? <FiEyeOff size={14} /> : <FiEye size={14} />}
              </button>
            </div>
          </div>
        </div>
      </Modal>

      {/* ── Edit User Modal ───────────────────────────────────── */}
      <Modal
        open={Boolean(editTarget)}
        onClose={closeEdit}
        title="Edit User"
        footer={
          <>
            <button className="btn btn-secondary" onClick={closeEdit} disabled={editSaving}>Cancel</button>
            <button className="btn btn-primary" onClick={handleEdit} disabled={editSaving}>
              {editSaving ? <><span className="spinner spinner-sm" /> Saving…</> : <><FiCheck size={14} /> Save Changes</>}
            </button>
          </>
        }
      >
        {editError && (
          <div className="alert alert-error" style={{ marginBottom: 16 }}>
            <FiAlertCircle size={14} />
            <span>{editError}</span>
          </div>
        )}
        {editTarget && (
          <>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">First Name</label>
                <input
                  className="form-control"
                  placeholder="First name"
                  value={editForm.firstName}
                  onChange={(e) => setEditForm((f) => ({ ...f, firstName: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Last Name</label>
                <input
                  className="form-control"
                  placeholder="Last name"
                  value={editForm.lastName}
                  onChange={(e) => setEditForm((f) => ({ ...f, lastName: e.target.value }))}
                />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                className="form-control"
                type="email"
                placeholder="user@example.com"
                value={editForm.email}
                onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Role</label>
              <select
                className="form-control"
                value={editForm.role}
                onChange={(e) => setEditForm((f) => ({ ...f, role: e.target.value }))}
              >
                <option value="ENGINEER">Engineer</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
          </>
        )}
      </Modal>

      {/* ── Change Password Modal ─────────────────────────────── */}
      <Modal
        open={Boolean(pwdTarget)}
        onClose={closePwd}
        title={`Change Password${pwdTarget ? ` — ${pwdTarget.firstName} ${pwdTarget.lastName}` : ''}`}
        footer={
          <>
            <button className="btn btn-secondary" onClick={closePwd} disabled={pwdSaving}>Cancel</button>
            <button className="btn btn-primary" onClick={handlePwd} disabled={pwdSaving}>
              {pwdSaving ? <><span className="spinner spinner-sm" /> Updating…</> : <><FiLock size={14} /> Update Password</>}
            </button>
          </>
        }
      >
        {pwdError && (
          <div className="alert alert-error" style={{ marginBottom: 16 }}>
            <FiAlertCircle size={14} />
            <span>{pwdError}</span>
          </div>
        )}
        {pwdTarget && (
          <>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
              Set a new password for <strong>{pwdTarget.firstName} {pwdTarget.lastName}</strong>. They will need to use this password on their next login.
            </p>
            <div className="form-group">
              <label className="form-label">New Password</label>
              <div className="input-wrap">
                <input
                  className="form-control"
                  type={showPwd ? 'text' : 'password'}
                  placeholder="Min. 6 characters"
                  style={{ paddingRight: 44 }}
                  value={pwdForm.newPassword}
                  onChange={(e) => setPwdForm((f) => ({ ...f, newPassword: e.target.value }))}
                />
                <button type="button" className="input-trailing-btn" tabIndex={-1} onClick={() => setShowPwd((v) => !v)}>
                  {showPwd ? <FiEyeOff size={14} /> : <FiEye size={14} />}
                </button>
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Confirm New Password</label>
              <div className="input-wrap">
                <input
                  className="form-control"
                  type={showCfm ? 'text' : 'password'}
                  placeholder="Repeat new password"
                  style={{ paddingRight: 44 }}
                  value={pwdForm.confirmPassword}
                  onChange={(e) => setPwdForm((f) => ({ ...f, confirmPassword: e.target.value }))}
                />
                <button type="button" className="input-trailing-btn" tabIndex={-1} onClick={() => setShowCfm((v) => !v)}>
                  {showCfm ? <FiEyeOff size={14} /> : <FiEye size={14} />}
                </button>
              </div>
            </div>
          </>
        )}
      </Modal>

      {/* ── Delete Confirm ────────────────────────────────────── */}
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
