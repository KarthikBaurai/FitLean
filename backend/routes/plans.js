// /api/plans: membership plans with their features (public, read-only).
const express = require('express');
const pool = require('../db');

const router = express.Router();

// GET /api/plans
router.get('/', async (req, res, next) => {
  try {
    const [plans] = await pool.query('SELECT * FROM membership_plans ORDER BY display_order');
    const [links] = await pool.query(
      `SELECT pf.plan_id, f.id, f.title
       FROM plan_features pf JOIN features f ON f.id = pf.feature_id
       ORDER BY f.id`
    );
    const [features] = await pool.query('SELECT id, title FROM features ORDER BY id');

    res.json({
      plans: plans.map((p) => ({
        ...p,
        price: Number(p.price),
        is_popular: Boolean(p.is_popular),
        features: links.filter((l) => l.plan_id === p.id).map((l) => ({ id: l.id, title: l.title })),
      })),
      features, // every feature, for the comparison table
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
