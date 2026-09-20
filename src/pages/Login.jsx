import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FiMail, FiLock, FiAlertCircle, FiEye, FiEyeOff, FiArrowRight } from 'react-icons/fi';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '', remember: false });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.email || !form.password) { setError('Please fill in all fields'); return; }
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Sign in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-bg" aria-hidden="true" />

      <div className="auth-card">

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

        <div className="auth-form-title">Operator sign in</div>
        <div className="auth-form-subtitle">
          Authorised personnel only. All actions are recorded in the audit trail.
        </div>

        {error && (
          <div className="alert alert-error" style={{ marginBottom: 'var(--sp-4)' }}>
            <FiAlertCircle size={15} />
            <span style={{ flex: 1 }}>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>

          <div className="form-group">
            <label className="form-label" htmlFor="email">Email address</label>
            <div className="input-wrap">
              <FiMail className="input-leading-icon" size={14} />
              <input
                id="email" name="email" type="email"
                autoComplete="email" className="form-control"
                style={{ paddingLeft: 36 }}
                placeholder="operator@agency.gov"
                value={form.email} onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">Password</label>
            <div className="input-wrap">
              <FiLock className="input-leading-icon" size={14} />
              <input
                id="password" name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password" className="form-control"
                style={{ paddingLeft: 36, paddingRight: 40 }}
                placeholder="••••••••"
                value={form.password} onChange={handleChange}
              />
              <button
                type="button" className="input-trailing-btn"
                onClick={() => setShowPassword((v) => !v)}
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <FiEyeOff size={14} /> : <FiEye size={14} />}
              </button>
            </div>
          </div>

          <div className="auth-row">
            <label className="remember-label">
              <input
                type="checkbox" name="remember"
                checked={form.remember} onChange={handleChange}
              />
              <span>Remember this terminal</span>
            </label>
            <button type="button" className="forgot-link">Forgot password?</button>
          </div>

          <button type="submit" className="btn auth-submit-btn" disabled={loading}>
            {loading
              ? <><span className="spinner spinner-sm" /> Authenticating…</>
              : <>Sign in <FiArrowRight size={14} /></>}
          </button>
        </form>

        <div className="auth-footer">
          Need an operator account? <Link to="/register">Request access</Link>
        </div>
      </div>
    </div>
  );
}
