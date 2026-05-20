const SKIP_KEYS = new Set(['password', 'currentPassword', 'newPassword', 'confirmPassword']);

function sanitizeString(value) {
  return value
    .trim()
    .replace(/<[^>]*>/g, '')        // strip HTML tags
    .replace(/javascript\s*:/gi, '') // remove JS protocol
    .replace(/on\w+\s*=/gi, '');    // remove inline event handlers
}

function sanitizeObject(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(item => sanitizeObject(item));

  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string' && !SKIP_KEYS.has(key)) {
      result[key] = sanitizeString(value);
    } else if (typeof value === 'object' && value !== null) {
      result[key] = sanitizeObject(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

export const sanitizeBody = (req, _res, next) => {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }
  next();
};
