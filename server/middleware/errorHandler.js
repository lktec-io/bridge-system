import logger from '../utils/logger.js';

const isDev = process.env.NODE_ENV !== 'production';

export const globalErrorHandler = (err, req, res, _next) => {
  const status = err.status || err.statusCode || 500;

  // ── MySQL errors ─────────────────────────────────────────────
  if (err.code === 'ER_DUP_ENTRY') {
    const match = err.message.match(/for key '(.+?)'/);
    const key   = match ? match[1].split('.').pop().replace(/_/g, ' ') : 'field';
    return res.status(409).json({ message: `A record with this ${key} already exists` });
  }

  if (err.code === 'ER_NO_REFERENCED_ROW_2') {
    return res.status(400).json({ message: 'Referenced record does not exist' });
  }

  if (err.code === 'ER_ROW_IS_REFERENCED_2') {
    return res.status(409).json({ message: 'Cannot delete — record is in use by related data' });
  }

  // ── Multer errors ────────────────────────────────────────────
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ message: 'File too large. Maximum allowed size is 5 MB' });
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({ message: 'Unexpected file upload field name' });
  }

  // ── JWT errors ───────────────────────────────────────────────
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ message: 'Invalid token' });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ message: 'Token expired — please log in again' });
  }

  // ── CORS errors ──────────────────────────────────────────────
  if (err.message?.startsWith('CORS:')) {
    return res.status(403).json({ message: err.message });
  }

  // ── Server errors ────────────────────────────────────────────
  if (status >= 500) {
    logger.error(`${req.method} ${req.path} — ${err.message}`);
    if (isDev) console.error(err.stack);
  }

  res.status(status).json({
    message: err.message || 'Internal server error',
    ...(isDev && status >= 500 ? { stack: err.stack } : {}),
  });
};
