// /api/stats: numbers for the admin dashboard (aggregate SQL).
const express = require('express');
const pool = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { now } = require('../utils/schedule');

const router = express.Router();

// GET /api/stats  (admin)
router.get('/', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const [[totals]] = await pool.query(
      `SELECT
         (SELECT COUNT(*) FROM users WHERE role = 'member') AS members,
         (SELECT COUNT(*) FROM trainers WHERE is_active = TRUE) AS trainers,
         (SELECT COUNT(*) FROM appointments WHERE status = 'confirmed' AND starts_at > ?) AS upcoming,
         (SELECT COUNT(*) FROM appointments) AS appointments,
         (SELECT COUNT(*) FROM enquiries WHERE status = 'new') AS new_enquiries`,
      [now()]
    );

    // Appointments per status (GROUP BY)
    const [byStatus] = await pool.query(
      'SELECT status, COUNT(*) AS count FROM appointments GROUP BY status ORDER BY status'
    );

    // Busiest trainers over the last 30 days (JOIN + GROUP BY + aggregate)
    const [byTrainer] = await pool.query(
      `SELECT t.id, t.name, COUNT(a.id) AS sessions, COALESCE(SUM(a.duration_minutes), 0) AS minutes
       FROM trainers t
       LEFT JOIN appointments a
              ON a.trainer_id = t.id
             AND a.status <> 'cancelled'
             AND a.starts_at >= ? - INTERVAL 30 DAY
             AND a.starts_at < ?
       WHERE t.is_active = TRUE
       GROUP BY t.id, t.name
       ORDER BY sessions DESC`,
      [now(), now()]
    );

    res.json({
      totals,
      byStatus,
      byTrainer: byTrainer.map((r) => ({ ...r, minutes: Number(r.minutes) })),
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
