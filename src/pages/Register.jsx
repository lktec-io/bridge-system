import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { MdErrorOutline, MdCheckCircle } from 'react-icons/md';

const initial = { firstName: '', lastName: '', email: '', password: '', confirmPassword: '', role: 'ENGINEER' };

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
      await register({ firstName: form.firstName, lastName: form.lastName, email: form.email, password: form.password, role: form.role });
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ maxWidth: 500 }}>
        <div className="auth-logo">
          <div className="auth-logo-icon">🌉</div>
          <h1>Bridge Information System</h1>
          <p>Civil Engineering Asset Management</p>
        </div>

        <h2 className="auth-form-title">Create an account</h2>

        {error && (
          <div className="alert alert-error">
            <MdErrorOutline size={18} /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="firstName">
                First Name <span className="required">*</span>
              </label>
              <input id="firstName" name="firstName" className="form-control" placeholder="John" value={form.firstName} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="lastName">
                Last Name <span className="required">*</span>
              </label>
              <input id="lastName" name="lastName" className="form-control" placeholder="Doe" value={form.lastName} onChange={handleChange} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="email">
              Email Address <span className="required">*</span>
            </label>
            <input id="email" name="email" type="email" className="form-control" placeholder="john.doe@example.com" value={form.email} onChange={handleChange} />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="role">Role</label>
            <select id="role" name="role" className="form-control" value={form.role} onChange={handleChange}>
              <option value="ENGINEER">Engineer</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="password">
                Password <span className="required">*</span>
              </label>
              <input id="password" name="password" type="password" className="form-control" placeholder="Min 6 characters" value={form.password} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="confirmPassword">
                Confirm Password <span className="required">*</span>
              </label>
              <input id="confirmPassword" name="confirmPassword" type="password" className="form-control" placeholder="Repeat password" value={form.confirmPassword} onChange={handleChange} />
            </div>
          </div>

          <div className="alert alert-info" style={{ fontSize: 13 }}>
            <MdCheckCircle size={16} />
            <span>Only administrators can register accounts. Ensure you have authorization.</span>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg"
            style={{ width: '100%', justifyContent: 'center' }}
            disabled={loading}
          >
            {loading ? <><span className="spinner-sm spinner" /> Creating account...</> : 'Create account'}
          </button>
        </form>

        <div className="auth-footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
