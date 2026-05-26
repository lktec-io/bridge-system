import bcrypt        from 'bcryptjs';
import pool          from '../config/database.js';
import generateToken from '../utils/generateToken.js';
import asyncHandler  from '../utils/asyncHandler.js';

// ── Register ─────────────────────────────────────────────────
export const register = asyncHandler(async (req, res) => {
  const { firstName, lastName, email, password, role } = req.body;

  if (!firstName || !lastName || !email || !password) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
  if (existing.length) return res.status(409).json({ message: 'Email already registered' });

  const hash     = await bcrypt.hash(password, 10);
  const userRole = role === 'ADMIN' ? 'ADMIN' : 'ENGINEER';

  const [result] = await pool.query(
    'INSERT INTO users (first_name, last_name, email, password, role) VALUES (?, ?, ?, ?, ?)',
    [firstName, lastName, email, hash, userRole]
  );

  res.status(201).json({
    id:        result.insertId,
    firstName,
    lastName,
    email,
    role:      userRole,
    token:     generateToken(result.insertId, userRole),
  });
});

// ── Login ────────────────────────────────────────────────────
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
  const user   = rows[0];

  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ message: 'Invalid email or password' });
  }

  res.json({
    id:        user.id,
    firstName: user.first_name,
    lastName:  user.last_name,
    email:     user.email,
    role:      user.role,
    token:     generateToken(user.id, user.role),
  });
});

// ── Get profile ──────────────────────────────────────────────
export const getMe = asyncHandler(async (req, res) => {
  res.json(req.user);
});

// ── List all users (admin) ───────────────────────────────────
export const getUsers = asyncHandler(async (req, res) => {
  const [rows] = await pool.query(
    'SELECT id, first_name, last_name, email, role, created_at FROM users ORDER BY created_at DESC'
  );
  res.json(rows.map(u => ({
    id:        u.id,
    firstName: u.first_name,
    lastName:  u.last_name,
    email:     u.email,
    role:      u.role,
    createdAt: u.created_at,
  })));
});

// ── Update role (admin) ──────────────────────────────────────
export const updateUserRole = asyncHandler(async (req, res) => {
  const id       = Number(req.params.id);
  const { role } = req.body;

  if (!['ADMIN', 'ENGINEER'].includes(role)) {
    return res.status(400).json({ message: 'Invalid role. Use ADMIN or ENGINEER.' });
  }

  const [check] = await pool.query('SELECT id FROM users WHERE id = ?', [id]);
  if (!check.length) return res.status(404).json({ message: 'User not found' });

  await pool.query('UPDATE users SET role = ? WHERE id = ?', [role, id]);

  const [rows] = await pool.query(
    'SELECT id, first_name, last_name, email, role FROM users WHERE id = ?', [id]
  );
  const u = rows[0];
  res.json({ id: u.id, firstName: u.first_name, lastName: u.last_name, email: u.email, role: u.role });
});

// ── Delete user (admin) ──────────────────────────────────────
export const deleteUser = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);

  if (id === req.user.id) {
    return res.status(400).json({ message: 'Cannot delete your own account' });
  }

  const [check] = await pool.query('SELECT id FROM users WHERE id = ?', [id]);
  if (!check.length) return res.status(404).json({ message: 'User not found' });

  await pool.query('DELETE FROM users WHERE id = ?', [id]);
  res.json({ message: 'User deleted successfully' });
});

// ── Admin create user ────────────────────────────────────────
export const adminCreateUser = asyncHandler(async (req, res) => {
  const { firstName, lastName, email, password, role } = req.body;

  if (!firstName || !lastName || !email || !password) {
    return res.status(400).json({ message: 'All fields are required' });
  }
  if (password.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters' });
  }

  const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email.toLowerCase().trim()]);
  if (existing.length) return res.status(409).json({ message: 'Email already registered' });

  const hash     = await bcrypt.hash(password, 10);
  const userRole = role === 'ADMIN' ? 'ADMIN' : 'ENGINEER';

  const [result] = await pool.query(
    'INSERT INTO users (first_name, last_name, email, password, role) VALUES (?, ?, ?, ?, ?)',
    [firstName.trim(), lastName.trim(), email.toLowerCase().trim(), hash, userRole]
  );

  res.status(201).json({
    id:        result.insertId,
    firstName: firstName.trim(),
    lastName:  lastName.trim(),
    email:     email.toLowerCase().trim(),
    role:      userRole,
    createdAt: new Date(),
  });
});

// ── Update user details (admin) ──────────────────────────────
export const updateUserDetails = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const { firstName, lastName, email, role } = req.body;

  if (!firstName || !lastName || !email) {
    return res.status(400).json({ message: 'First name, last name and email are required' });
  }

  const [check] = await pool.query('SELECT id FROM users WHERE id = ?', [id]);
  if (!check.length) return res.status(404).json({ message: 'User not found' });

  const [dup] = await pool.query('SELECT id FROM users WHERE email = ? AND id != ?', [email.toLowerCase().trim(), id]);
  if (dup.length) return res.status(409).json({ message: 'Email already in use by another account' });

  const userRole = role === 'ADMIN' ? 'ADMIN' : 'ENGINEER';

  await pool.query(
    'UPDATE users SET first_name = ?, last_name = ?, email = ?, role = ? WHERE id = ?',
    [firstName.trim(), lastName.trim(), email.toLowerCase().trim(), userRole, id]
  );

  const [rows] = await pool.query(
    'SELECT id, first_name, last_name, email, role, created_at FROM users WHERE id = ?', [id]
  );
  const u = rows[0];
  res.json({
    id:        u.id,
    firstName: u.first_name,
    lastName:  u.last_name,
    email:     u.email,
    role:      u.role,
    createdAt: u.created_at,
  });
});

// ── Change user password (admin) ─────────────────────────────
export const changeUserPassword = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const { newPassword, confirmPassword } = req.body;

  if (!newPassword || !confirmPassword) {
    return res.status(400).json({ message: 'Both password fields are required' });
  }
  if (newPassword !== confirmPassword) {
    return res.status(400).json({ message: 'Passwords do not match' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters' });
  }

  const [check] = await pool.query('SELECT id FROM users WHERE id = ?', [id]);
  if (!check.length) return res.status(404).json({ message: 'User not found' });

  const hash = await bcrypt.hash(newPassword, 10);
  await pool.query('UPDATE users SET password = ? WHERE id = ?', [hash, id]);

  res.json({ message: 'Password updated successfully' });
});
