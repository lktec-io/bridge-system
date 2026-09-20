import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiAlertCircle, FiShield, FiArrowRight } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';

const initial = {
  firstName: '', lastName: '', email: '',
  password: '', confirmPassword: '', role: 'ENGINEER',
};

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(initial);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const validate = () => {
    if (!form.firstName || !form.lastName || !form.email || !form.password)
      return 'All fields are required';
    if (form.password.length < 6)
      return 'Password must be at least 6 characters';
    if (form.password !== form.confirmPassword)
      return 'Passwords do not match';
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = validate();
    if (err) { setError(err); return; }
    setError('');
    setLoading(true);
    try {
      await register({
        firstName: form.firstName, lastName: form.lastName,
        email: form.email, password: form.password, role: form.role,
      });
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-bg" aria-hidden="true" />

      <div className="auth-card" style={{ maxWidth: 520 }}>

        <div className="auth-logo">
          <div className="auth-logo-icon" aria-hidden="true">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.1" strokeLinecap="square">
              <path d="M2 17h20" />
              <path d="M2 17V9" />
              <path d="M22 17V9" />
              <path d="M2 12c5-4 15-4 20 0" />
              <path d="M8 17v-3.2" />
              <path d="M16 17v-3.2" />
            </svg>
          </div>
          <div className="auth-logo-text">
            <h1>BMS</h1>
            <p>Bridge Management System</p>
          </div>
        </div>

        <div className="auth-hr" />

        <div className="auth-form-title">Request operator access</div>
        <div className="auth-form-subtitle">
          Accounts carry write access to structural records. Only create one with authorisation.
        </div>

        {error && (
          <div className="alert alert-error" style={{ marginBottom: 'var(--sp-4)' }}>
            <FiAlertCircle size={15} />
            <span style={{ flex: 1 }}>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="firstName">First name</label>
              <input
                id="firstName" name="firstName" className="form-control"
                autoComplete="given-name" placeholder="John"
                value={form.firstName} onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="lastName">Last name</label>
              <input
                id="lastName" name="lastName" className="form-control"
                autoComplete="family-name" placeholder="Banda"
                value={form.lastName} onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="email">Email address</label>
            <input
              id="email" name="email" type="email" className="form-control"
              autoComplete="email" placeholder="j.banda@agency.gov"
              value={form.email} onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="role">Access role</label>
            <select id="role" name="role" className="form-control" value={form.role} onChange={handleChange}>
              <option value="ENGINEER">Engineer — file inspections and maintenance</option>
              <option value="ADMIN">Administrator — full access including deletion</option>
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="password">Password</label>
              <input
                id="password" name="password" type="password" className="form-control"
                autoComplete="new-password" placeholder="Minimum 6 characters"
                value={form.password} onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="confirmPassword">Confirm password</label>
              <input
                id="confirmPassword" name="confirmPassword" type="password" className="form-control"
                autoComplete="new-password" placeholder="Repeat password"
                value={form.confirmPassword} onChange={handleChange}
              />
            </div>
          </div>

          <div className="alert alert-info" style={{ marginBottom: 'var(--sp-4)' }}>
            <FiShield size={15} style={{ flexShrink: 0 }} />
            <span>
              Every create, update, resolution and deletion is written to the audit trail
              against your account.
            </span>
          </div>

          <button type="submit" className="btn auth-submit-btn" disabled={loading}>
            {loading
              ? <><span className="spinner spinner-sm" /> Creating account…</>
              : <>Create account <FiArrowRight size={14} /></>}
          </button>
        </form>

        <div className="auth-footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
