// Small validation helpers used by the routes.
//
// Every route validates its input on the server BEFORE touching the
// database, so requests that bypass the website (e.g. from Postman) are
// refused with 400 just like the form would refuse them.

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE = /^\+?[0-9 ()-]{7,20}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/; // 2026-11-20
const DATETIME = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2})?$/; // 2026-11-20 10:30
const SLUG = /^[a-z0-9-]{2,60}$/;

const isString = (v) => typeof v === 'string';
const isEmail = (v) => isString(v) && v.length <= 254 && EMAIL.test(v);
const isPhone = (v) => isString(v) && PHONE.test(v);
const isDate = (v) => isString(v) && DATE.test(v) && !Number.isNaN(Date.parse(v));
const isSlug = (v) => isString(v) && SLUG.test(v);

// "2026-11-20T10:30" or "2026-11-20 10:30:00" -> "2026-11-20 10:30:00", or null.
function toDateTime(v) {
  if (!isString(v) || !DATETIME.test(v)) return null;
  const s = v.replace('T', ' ');
  const full = s.length === 16 ? `${s}:00` : s;
  return Number.isNaN(Date.parse(full.replace(' ', 'T'))) ? null : full;
}

// Positive whole number (ids, page numbers), or null.
function toId(v) {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
}

// Trimmed string between min and max characters, or null.
function text(v, min, max) {
  if (!isString(v)) return null;
  const t = v.trim();
  return t.length >= min && t.length <= max ? t : null;
}

// Send the standard 400 response: { error, fields: { field: message } }
function badRequest(res, fields) {
  return res.status(400).json({ error: 'Please check the highlighted fields', fields });
}

module.exports = { isEmail, isPhone, isDate, isSlug, toDateTime, toId, text, badRequest };
