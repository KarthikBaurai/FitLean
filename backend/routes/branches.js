// /api/branches: gym locations (public, read-only).
const express = require('express');
const pool = require('../db');

const router = express.Router();

// GET /api/branches  -> active branches with how many trainers each has
router.get('/', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT b.id, b.slug, b.name, b.address, b.city, b.phone, b.opens_at, b.closes_at, b.description,
              COUNT(t.id) AS trainer_count
       FROM branches b
       LEFT JOIN trainers t ON t.branch_id = b.id AND t.is_active = TRUE
       WHERE b.is_active = TRUE
       GROUP BY b.id
       ORDER BY b.name`
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// GET /api/branches/:slug  -> one branch and its trainers
router.get('/:slug', async (req, res, next) => {
  try {
    const [[branch]] = await pool.query(
      'SELECT * FROM branches WHERE slug = ? AND is_active = TRUE',
      [req.params.slug]
    );
    if (!branch) return res.status(404).json({ error: 'Branch not found' });
    const [trainers] = await pool.query(
      'SELECT id, slug, name, title, image_url FROM trainers WHERE branch_id = ? AND is_active = TRUE ORDER BY name',
      [branch.id]
    );
    res.json({ ...branch, trainers });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
