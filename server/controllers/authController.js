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
