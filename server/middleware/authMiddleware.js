import jwt  from 'jsonwebtoken';
import pool from '../config/database.js';

export const protect = async (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Not authorized — no token provided' });
  }

  try {
    const decoded = jwt.verify(auth.split(' ')[1], process.env.JWT_SECRET);

    const [rows] = await pool.query(
      'SELECT id, first_name, last_name, email, role FROM users WHERE id = ?',
      [decoded.id]
    );
    if (!rows.length) return res.status(401).json({ message: 'User not found' });

    const u  = rows[0];
    req.user = {
      id:        u.id,
      firstName: u.first_name,
      lastName:  u.last_name,
      email:     u.email,
      role:      u.role,
    };
    next();
  } catch {
    res.status(401).json({ message: 'Not authorized — invalid or expired token' });
  }
};

export const adminOnly = (req, res, next) => {
  if (req.user?.role !== 'ADMIN') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};
