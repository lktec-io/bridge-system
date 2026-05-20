const errorMiddleware = (err, req, res, next) => {
  const status = err.status || err.statusCode || 500;

  // MySQL duplicate entry (UNIQUE constraint violation)
  if (err.code === 'ER_DUP_ENTRY') {
    const match = err.message.match(/for key '(.+?)'/);
    const key   = match ? match[1].split('.').pop().replace(/_/g, ' ') : 'field';
    return res.status(409).json({ message: `A record with this ${key} already exists` });
  }

  // Multer: file too large
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ message: 'File too large. Maximum size is 5 MB.' });
  }

  // Multer: wrong field name
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({ message: 'Unexpected file upload field.' });
  }

  if (status >= 500) {
    console.error(`[${new Date().toISOString()}] ${req.method} ${req.path} — ${err.message}`);
    if (process.env.NODE_ENV === 'development') console.error(err.stack);
  }

  res.status(status).json({ message: err.message || 'Internal server error' });
};

export default errorMiddleware;
