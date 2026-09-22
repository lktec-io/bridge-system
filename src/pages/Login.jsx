import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  FiMail, FiLock, FiAlertCircle, FiEye, FiEyeOff, FiArrowRight, FiShield,
} from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import AuthBackdrop from '../components/auth/AuthBackdrop';

/* Terminal identifier shown on the classification strip — stable per session. */
const TERMINAL_ID = `BMS-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

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
    if (!form.email || !form.password) {
      setError('Enter both an email address and a password to continue');
      return;
    }
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Sign in failed. Check your credentials and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">

      {/* ── Left: structural identity ─────────────────────────── */}
      <aside className="auth-brandpanel">
        <AuthBackdrop />

        <span className="auth-eyebrow">Infrastructure Terminal</span>

        <div>
          <h1 className="auth-headline">
            Structural intelligence
            <em>for every span.</em>
          </h1>
          <p className="auth-sub">
            Condition ratings, inspection history, geospatial tracking and live
            telemetry for the managed bridge portfolio — one authoritative record
            per structure.
          </p>

          <div className="auth-ledger">
            <div className="auth-ledger-row">
              <span className="k">Asset inventory</span>
              <span className="v">Geometry · GIS</span>
            </div>
            <div className="auth-ledger-row">
              <span className="k">Inspection regime</span>
              <span className="v">Rated · Audited</span>
            </div>
            <div className="auth-ledger-row">
              <span className="k">Structural telemetry</span>
              <span className="v">Threshold alarms</span>
            </div>
          </div>
        </div>

        <div className="auth-orgline">
          <strong>Bridge Management System</strong>
          Roads &amp; Infrastructure Authority · Asset Management Directorate
        </div>
      </aside>

      {/* ── Right: operator access ────────────────────────────── */}
      <main className="auth-formpanel">
        <div className="auth-form">

          <div className="auth-classification">
            <span>Terminal {TERMINAL_ID}</span>
            <span className="secure">
              <FiShield size={12} /> Secure channel
            </span>
          </div>

          <div className="auth-logo">
            <div className="auth-logo-icon" aria-hidden="true">
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="square">
                <path d="M2 17h20" />
                <path d="M2 17V9" />
                <path d="M22 17V9" />
                <path d="M2 12c5-4 15-4 20 0" />
                <path d="M8 17v-3.4" />
                <path d="M16 17v-3.4" />
                <path d="M12 17v-4.6" />
              </svg>
            </div>
            <div className="auth-logo-text">
              <h1>BMS</h1>
              <p>Bridge Management System</p>
            </div>
          </div>

          <div className="auth-hr" />

          <h2 className="auth-form-title">Operator sign in</h2>
          <p className="auth-form-subtitle">
            Authorised infrastructure personnel only. Credentials are issued by the
            Asset Management Directorate.
          </p>

          {error && (
            <div className="alert alert-error" style={{ marginBottom: 'var(--sp-5)' }} role="alert">
              <FiAlertCircle size={16} />
              <span style={{ flex: 1 }}>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>

            {/* Floating label: input precedes label so CSS can react to
                :focus and :not(:placeholder-shown) on its sibling. */}
            <div className="form-group">
              <div className="field-float has-icon">
                <FiMail className="input-leading-icon" size={16} />
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  className="form-control"
                  placeholder=" "
                  value={form.email}
                  onChange={handleChange}
                  autoFocus
                />
                <label htmlFor="email">Email address</label>
              </div>
            </div>

            <div className="form-group">
              <div className="field-float has-icon has-action">
                <FiLock className="input-leading-icon" size={16} />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  className="form-control"
                  placeholder=" "
                  value={form.password}
                  onChange={handleChange}
                />
                <label htmlFor="password">Password</label>
                <button
                  type="button"
                  className="input-trailing-btn"
                  onClick={() => setShowPassword((v) => !v)}
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                </button>
              </div>
            </div>

            <div className="auth-row">
              <label className="remember-label">
                <input
                  type="checkbox"
                  name="remember"
                  checked={form.remember}
                  onChange={handleChange}
                />
                <span>Remember this terminal</span>
              </label>
              <button type="button" className="forgot-link">Forgot password?</button>
            </div>

            <button type="submit" className="btn auth-submit-btn" disabled={loading}>
              {loading
                ? <><span className="spinner spinner-sm" /> Authenticating…</>
                : <>Sign in <FiArrowRight size={17} /></>}
            </button>
          </form>

          <div className="auth-notice">
            <FiShield size={15} />
            <span>
              Every create, update, approval and deletion is recorded against your
              account in the system audit trail.
            </span>
          </div>

          <div className="auth-footer">
            Need an operator account? <Link to="/register">Request access</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
