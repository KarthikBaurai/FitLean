// /api/trainers: trainer profiles, their free times, and admin management.
const express = require('express');
const pool = require('../db');
const { requireAuth, requireAdmin, optionalAuth } = require('../middleware/auth');
const { withTransaction, HttpError, sendError } = require('../utils/transaction');
const { DURATIONS, freeSlots } = require('../utils/schedule');
const { isDate, isSlug, toId, text, badRequest } = require('../utils/validate');

const router = express.Router();

// Adds `specializations: [{ id, name }]` to each trainer (from the
// trainer_specializations join table).
async function withSpecializations(trainers) {
  if (trainers.length === 0) return trainers;
  const [links] = await pool.query(
    `SELECT ts.trainer_id, s.id, s.name
     FROM trainer_specializations ts JOIN specializations s ON s.id = ts.specialization_id
     WHERE ts.trainer_id IN (?)
     ORDER BY s.name`,
    [trainers.map((t) => t.id)]
  );
  return trainers.map((t) => ({
    ...t,
    is_active: Boolean(t.is_active),
    specializations: links.filter((l) => l.trainer_id === t.id).map((l) => ({ id: l.id, name: l.name })),
  }));
}

const SELECT_TRAINER = `
  SELECT t.id, t.slug, t.name, t.title, t.bio, t.experience_years, t.image_url, t.is_active,
         t.branch_id, b.name AS branch_name, b.slug AS branch_slug, b.city AS branch_city
  FROM trainers t JOIN branches b ON b.id = t.branch_id`;

// GET /api/trainers?branchId=1   (admins may add &includeInactive=true)
router.get('/', optionalAuth, async (req, res, next) => {
  const where = [];
  const params = [];
  if (req.query.branchId) {
    const branchId = toId(req.query.branchId);
    if (!branchId) return badRequest(res, { branchId: 'branchId must be a positive number' });
    where.push('t.branch_id = ?');
    params.push(branchId);
  }
  const isAdmin = req.user && req.user.role === 'admin';
  if (!(isAdmin && req.query.includeInactive === 'true')) where.push('t.is_active = TRUE');

  try {
    const [rows] = await pool.query(
      `${SELECT_TRAINER} ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY t.id`,
      params
    );
    res.json(await withSpecializations(rows));
  } catch (err) {
    next(err);
  }
});

// GET /api/trainers/specializations  -> list for the admin form
router.get('/specializations', async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT id, name FROM specializations ORDER BY name');
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// GET /api/trainers/:idOrSlug  -> profile with working hours
router.get('/:idOrSlug', async (req, res, next) => {
  const key = req.params.idOrSlug;
  const id = toId(key);
  if (!id && !isSlug(key)) return res.status(404).json({ error: 'Trainer not found' });
  try {
    const [rows] = await pool.query(
      `${SELECT_TRAINER} WHERE ${id ? 't.id = ?' : 't.slug = ?'} AND t.is_active = TRUE`,
      [id || key]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Trainer not found' });
    const [trainer] = await withSpecializations(rows);
    const [hours] = await pool.query(
      'SELECT weekday, start_time, end_time FROM trainer_availability WHERE trainer_id = ? ORDER BY weekday',
      [trainer.id]
    );
    res.json({ ...trainer, hours });
  } catch (err) {
    next(err);
  }
});

// GET /api/trainers/:id/slots?date=2026-11-20&duration=60  -> free start times
router.get('/:id/slots', async (req, res, next) => {
  const id = toId(req.params.id);
  const { date } = req.query;
  const duration = Number(req.query.duration || 60);
  const fields = {};
  if (!id) fields.id = 'Invalid trainer id';
  if (!isDate(date)) fields.date = 'date must look like 2026-11-20';
  if (!DURATIONS.includes(duration)) fields.duration = 'duration must be 30, 60 or 90';
  if (Object.keys(fields).length) return badRequest(res, fields);

  try {
    const [[trainer]] = await pool.query('SELECT id FROM trainers WHERE id = ? AND is_active = TRUE', [id]);
    if (!trainer) return res.status(404).json({ error: 'Trainer not found' });
    res.json(await freeSlots(pool, id, date, duration));
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------- admin

function readTrainerBody(body) {
  const fields = {};
  const name = text(body.name, 2, 100);
  const title = text(body.title, 2, 120);
  const bio = body.bio ? text(body.bio, 0, 2000) : '';
  const branchId = toId(body.branchId);
  const experience = Number(body.experienceYears);
  const specializationIds = Array.isArray(body.specializationIds) ? body.specializationIds.map(toId) : [];
  const slug = body.slug
    ? body.slug
    : (name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  if (!name) fields.name = 'Name must be 2-100 characters';
  if (!title) fields.title = 'Title must be 2-120 characters';
  if (bio === null) fields.bio = 'Bio must be at most 2000 characters';
  if (!branchId) fields.branchId = 'Choose a branch';
  if (!Number.isInteger(experience) || experience < 0 || experience > 60) {
    fields.experienceYears = 'Experience must be a whole number from 0 to 60';
  }
  if (specializationIds.some((s) => !s)) fields.specializationIds = 'Invalid specialisation';
  if (!isSlug(slug)) fields.slug = 'Slug may contain only a-z, 0-9 and -';

  return { fields, trainer: { name, title, bio, branchId, experience, specializationIds, slug } };
}

function trainerErrors(err, res, next) {
  if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'A trainer with this slug already exists' });
  if (err.code === 'ER_NO_REFERENCED_ROW_2') return badRequest(res, { branchId: 'Unknown branch or specialisation' });
  sendError(err, res, next);
}

// POST /api/trainers  (admin)
// One transaction: the trainer, their specialisations and default working
// hours are saved together, or not at all.
router.post('/', requireAuth, requireAdmin, async (req, res, next) => {
  const { fields, trainer: t } = readTrainerBody(req.body);
  if (Object.keys(fields).length) return badRequest(res, fields);
  try {
    const id = await withTransaction(async (conn) => {
      const [r] = await conn.query(
        'INSERT INTO trainers (branch_id, slug, name, title, bio, experience_years) VALUES (?, ?, ?, ?, ?, ?)',
        [t.branchId, t.slug, t.name, t.title, t.bio, t.experience]
      );
      for (const sid of t.specializationIds) {
        await conn.query('INSERT INTO trainer_specializations (trainer_id, specialization_id) VALUES (?, ?)', [r.insertId, sid]);
      }
      for (let day = 1; day <= 6; day++) {
        await conn.query(
          "INSERT INTO trainer_availability (trainer_id, weekday, start_time, end_time) VALUES (?, ?, '09:00', '18:00')",
          [r.insertId, day]
        );
      }
      return r.insertId;
    });
    res.status(201).json({ id, slug: t.slug });
  } catch (err) {
    trainerErrors(err, res, next);
  }
});

// PUT /api/trainers/:id  (admin)  -> replace the trainer's details
router.put('/:id', requireAuth, requireAdmin, async (req, res, next) => {
  const id = toId(req.params.id);
  if (!id) return badRequest(res, { id: 'Invalid id' });
  const { fields, trainer: t } = readTrainerBody(req.body);
  if (Object.keys(fields).length) return badRequest(res, fields);
  const isActive = req.body.isActive === undefined ? true : Boolean(req.body.isActive);
  try {
    await withTransaction(async (conn) => {
      const [r] = await conn.query(
        `UPDATE trainers SET branch_id = ?, slug = ?, name = ?, title = ?, bio = ?, experience_years = ?, is_active = ?
         WHERE id = ?`,
        [t.branchId, t.slug, t.name, t.title, t.bio, t.experience, isActive, id]
      );
      if (r.affectedRows === 0) throw new HttpError(404, 'Trainer not found');
      await conn.query('DELETE FROM trainer_specializations WHERE trainer_id = ?', [id]);
      for (const sid of t.specializationIds) {
        await conn.query('INSERT INTO trainer_specializations (trainer_id, specialization_id) VALUES (?, ?)', [id, sid]);
      }
    });
    res.json({ id, slug: t.slug });
  } catch (err) {
    trainerErrors(err, res, next);
  }
});

// DELETE /api/trainers/:id  (admin)
// Trainers are deactivated, not deleted: their past appointments must
// keep pointing at them.
router.delete('/:id', requireAuth, requireAdmin, async (req, res, next) => {
  const id = toId(req.params.id);
  if (!id) return badRequest(res, { id: 'Invalid id' });
  try {
    const [r] = await pool.query('UPDATE trainers SET is_active = FALSE WHERE id = ?', [id]);
    if (r.affectedRows === 0) return res.status(404).json({ error: 'Trainer not found' });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
