import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FiMail, FiLock, FiAlertCircle, FiEye, FiEyeOff } from 'react-icons/fi';
import { MdDomain } from 'react-icons/md';

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
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">

      {/* Animated background blobs */}
      <div className="auth-bg" aria-hidden="true">
        <div className="auth-blob auth-blob-1" />
        <div className="auth-blob auth-blob-2" />
        <div className="auth-blob auth-blob-3" />
        <div className="auth-blob auth-blob-4" />
      </div>

      <div className="auth-card login-card">

        {/* Brand */}
        <div className="auth-logo">
          <div className="auth-logo-icon">
            <MdDomain size={26} color="#fff" />
          </div>
          <div className="auth-logo-text">
            <h1>BARAKA MICROCREDIT</h1>
            <p>Loan &amp; Asset Management Platform</p>
          </div>
        </div>

        <div className="auth-hr" />

        <h2 className="auth-form-title">Welcome back</h2>
        <p className="auth-form-subtitle">Sign in to access your dashboard</p>

        {error && (
          <div className="alert alert-error" style={{ marginBottom: 20 }}>
            <FiAlertCircle size={16} />
            <span style={{ flex: 1 }}>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>

          <div className="form-group">
            <label className="form-label" htmlFor="email">Email address</label>
            <div className="input-wrap">
              <FiMail className="input-leading-icon" size={15} />
              <input
                id="email" name="email" type="email"
                autoComplete="email" className="form-control"
                style={{ paddingLeft: 40 }}
                placeholder="you@example.com"
                value={form.email} onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">Password</label>
            <div className="input-wrap">
              <FiLock className="input-leading-icon" size={15} />
              <input
                id="password" name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password" className="form-control"
                style={{ paddingLeft: 40, paddingRight: 44 }}
                placeholder="••••••••"
                value={form.password} onChange={handleChange}
              />
              <button
                type="button" className="input-trailing-btn"
                onClick={() => setShowPassword((v) => !v)}
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <FiEyeOff size={15} /> : <FiEye size={15} />}
              </button>
            </div>
          </div>

          <div className="auth-row">
            <label className="remember-label">
              <input
                type="checkbox" name="remember"
                checked={form.remember} onChange={handleChange}
              />
              <span>Remember me</span>
            </label>
            <button type="button" className="forgot-link">Forgot password?</button>
          </div>

          <button
            type="submit"
            className="btn auth-submit-btn"
            disabled={loading}
          >
            {loading
              ? <><span className="spinner spinner-sm" /> Signing in…</>
              : 'Sign in'
            }
          </button>

        </form>
      </div>
    </div>
  );
}
