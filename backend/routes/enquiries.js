// /api/enquiries: the public contact form, and the admin inbox.
const express = require('express');
const pool = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { isEmail, isPhone, toId, text, badRequest } = require('../utils/validate');

const router = express.Router();

const GOALS = ['Weight Loss', 'Muscle Gain', 'General Fitness', 'Strength', 'Rehabilitation', 'Other'];
const STATUSES = ['new', 'contacted', 'closed'];

// POST /api/enquiries  (anyone)  { fullName, email, phone?, goal, message }
router.post('/', async (req, res, next) => {
  const { email, phone, goal } = req.body;
  const fullName = text(req.body.fullName, 2, 100);
  const message = text(req.body.message, 10, 2000);
  const fields = {};
  if (!fullName) fields.fullName = 'Enter your name (2-100 characters)';
  if (!isEmail(email)) fields.email = 'Enter a valid email address';
  if (phone && !isPhone(phone)) fields.phone = 'Enter a valid phone number';
  if (!GOALS.includes(goal)) fields.goal = 'Choose one of the listed goals';
  if (!message) fields.message = 'Write a message of 10-2000 characters';
  if (Object.keys(fields).length) return badRequest(res, fields);

  try {
    const [result] = await pool.query(
      'INSERT INTO enquiries (full_name, email, phone, goal, message) VALUES (?, ?, ?, ?, ?)',
      [fullName, email, phone || null, goal, message]
    );
    res.status(201).json({ id: result.insertId, message: 'Thanks! We will get back to you soon.' });
  } catch (err) {
    next(err);
  }
});

// GET /api/enquiries?status=new  (admin)
router.get('/', requireAuth, requireAdmin, async (req, res, next) => {
  const { status } = req.query;
  if (status && !STATUSES.includes(status)) return badRequest(res, { status: 'Unknown status' });
  try {
    const [rows] = await pool.query(
      `SELECT * FROM enquiries ${status ? 'WHERE status = ?' : ''} ORDER BY created_at DESC LIMIT 200`,
      status ? [status] : []
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/enquiries/:id  (admin)  { status }
router.patch('/:id', requireAuth, requireAdmin, async (req, res, next) => {
  const id = toId(req.params.id);
  if (!id) return badRequest(res, { id: 'Invalid id' });
  if (!STATUSES.includes(req.body.status)) return badRequest(res, { status: 'Status must be new, contacted or closed' });
  try {
    const [result] = await pool.query('UPDATE enquiries SET status = ? WHERE id = ?', [req.body.status, id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Enquiry not found' });
    const [[row]] = await pool.query('SELECT * FROM enquiries WHERE id = ?', [id]);
    res.json(row);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
