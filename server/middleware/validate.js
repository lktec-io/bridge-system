/**
 * Request body sanitisation.
 *
 * ── Why this does NOT strip HTML ──────────────────────────────────
 * The previous implementation ran `.replace(/<[^>]*>/g, '')` over every
 * string field. Structural inspection text is precisely where comparison
 * operators appear, so a defect recorded as
 *
 *     "crack width <2mm, depth >5mm at pier 4"
 *
 * matched `<2mm, depth >` as an HTML tag and was silently stored as
 *
 *     "crack width 5mm at pier 4"
 *
 * The measurement was inverted, no error was raised, and the original text
 * was unrecoverable. That is data corruption in the field records this
 * system exists to preserve.
 *
 * ── Why removing it is safe ──────────────────────────────────────
 * XSS is an OUTPUT concern, not a storage concern. Every value read back
 * is rendered by React, which escapes text nodes by default — the app uses
 * no `dangerouslySetInnerHTML` anywhere, so stored angle brackets can never
 * become executable markup. Storing exactly what the engineer typed and
 * escaping at render time is both safer and lossless.
 *
 * If a field is ever rendered as raw HTML, sanitise THAT field at THAT
 * boundary with a real parser (DOMPurify), never with a regex over every
 * field in every request.
 */

/* Password fields are passed through untouched — trimming or altering them
   would change the credential the user actually typed. */
const SKIP_KEYS = new Set(['password', 'currentPassword', 'newPassword', 'confirmPassword']);

/* Control characters that can corrupt logs or terminal output. Angle
   brackets, quotes, ampersands and mathematical symbols are all preserved. */
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

export function sanitizeString(value) {
  return value.replace(CONTROL_CHARS, '').trim();
}

function sanitizeObject(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map((item) => sanitizeObject(item));

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
