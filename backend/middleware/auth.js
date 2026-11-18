// Authentication middleware.
//
// The client sends:  Authorization: Bearer <token>
// The token is a JWT created at login (routes/auth.js) holding { id, role }.
const jwt = require('jsonwebtoken');

// Any logged-in user (member or admin). Sets req.user = { id, role, name }.
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Please log in first' });
  }
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Your session has expired, please log in again' });
  }
}

// Admins only. Always used after requireAuth.
function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admins only' });
  }
  next();
}

// Public routes that show extra data to admins: sets req.user if a valid
// token was sent, but never refuses the request.
function optionalAuth(req, res, next) {
  const [scheme, token] = (req.headers.authorization || '').split(' ');
  if (scheme === 'Bearer' && token) {
    try {
      req.user = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      // invalid token: treat as a visitor
    }
  }
  next();
}

module.exports = { requireAuth, requireAdmin, optionalAuth };
