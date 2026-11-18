// /api/users: member list for admins.
const express = require('express');
const pool = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { toId, badRequest } = require('../utils/validate');

const router = express.Router();
const PAGE_SIZE = 25;

// GET /api/users?search=asha&page=1  (admin)
// Each member with their number of bookings (LEFT JOIN + GROUP BY).
router.get('/', requireAuth, requireAdmin, async (req, res, next) => {
  const page = req.query.page ? toId(req.query.page) : 1;
  if (!page) return badRequest(res, { page: 'page must be a positive number' });
  const search = typeof req.query.search === 'string' ? req.query.search.trim().slice(0, 100) : '';
  const where = search ? 'WHERE u.full_name LIKE ? OR u.email LIKE ?' : '';
  const params = search ? [`%${search}%`, `%${search}%`] : [];

  try {
    const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM users u ${where}`, params);
    const [rows] = await pool.query(
      `SELECT u.id, u.full_name, u.email, u.phone, u.role, u.created_at,
              COUNT(a.id) AS total_bookings,
              SUM(a.status = 'confirmed') AS upcoming_bookings
       FROM users u
       LEFT JOIN appointments a ON a.member_id = u.id
       ${where}
       GROUP BY u.id
       ORDER BY u.id
       LIMIT ? OFFSET ?`,
      [...params, PAGE_SIZE, (page - 1) * PAGE_SIZE]
    );
    res.json({
      users: rows.map((r) => ({ ...r, upcoming_bookings: Number(r.upcoming_bookings || 0) })),
      page,
      pageSize: PAGE_SIZE,
      total,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
