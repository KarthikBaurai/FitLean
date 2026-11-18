// /api/auth: register, log in, and "who am I".
const express = require('express');
const bcrypt = require('bcryptjs'); // bcrypt in pure JavaScript (no native build needed)
const jwt = require('jsonwebtoken');
const pool = require('../db');
const { requireAuth } = require('../middleware/auth');
const { isEmail, isPhone, text, badRequest } = require('../utils/validate');

const router = express.Router();

function makeToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, name: user.full_name },
    process.env.JWT_SECRET,
    { expiresIn: '8h' }
  );
}

function publicUser(user) {
  return { id: user.id, fullName: user.full_name, email: user.email, phone: user.phone, role: user.role };
}

// POST /api/auth/register  { fullName, email, password, phone? }
router.post('/register', async (req, res, next) => {
  const { email, password, phone } = req.body;
  const fullName = text(req.body.fullName, 2, 100);
  const fields = {};
  if (!fullName) fields.fullName = 'Enter your full name (2-100 characters)';
  if (!isEmail(email)) fields.email = 'Enter a valid email address';
  if (typeof password !== 'string' || password.length < 8 || password.length > 72 ||
      !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    fields.password = 'Password must be 8-72 characters with at least one letter and one number';
  }
  if (phone && !isPhone(phone)) fields.phone = 'Enter a valid phone number';
  if (Object.keys(fields).length) return badRequest(res, fields);

  try {
    // bcrypt: one-way hash with a random salt. The plain password is never stored.
    const hash = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      'INSERT INTO users (full_name, email, password_hash, phone) VALUES (?, ?, ?, ?)',
      [fullName, email.toLowerCase(), hash, phone || null]
    );
    const user = { id: result.insertId, full_name: fullName, email: email.toLowerCase(), phone: phone || null, role: 'member' };
    res.status(201).json({ token: makeToken(user), user: publicUser(user) });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }
    next(err);
  }
});

// POST /api/auth/login  { email, password }
router.post('/login', async (req, res, next) => {
  const { email, password } = req.body;
  if (!isEmail(email) || typeof password !== 'string' || !password) {
    return badRequest(res, { email: 'Enter your email and password' });
  }
  try {
    const [[user]] = await pool.query('SELECT * FROM users WHERE email = ?', [email.toLowerCase()]);
    // Same message for "no such user" and "wrong password", so nobody can
    // find out which emails are registered.
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: 'Incorrect email or password' });
    }
    res.json({ token: makeToken(user), user: publicUser(user) });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me  -> the logged-in user
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const [[user]] = await pool.query('SELECT * FROM users WHERE id = ?', [req.user.id]);
    if (!user) return res.status(401).json({ error: 'Please log in again' });
    res.json(publicUser(user));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
