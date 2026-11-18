// /api/appointments: booking, rescheduling and cancelling sessions.
//
// ===================== THE HARD REQUIREMENT ==========================
// "If two members book the same trainer slot at the same moment, a naive
//  version would create two bookings."
//
// Naive version:  SELECT (is it free?) ... then INSERT.
//   Both requests run the SELECT before either INSERTs, both see "free",
//   both insert -> double booking.
//
// Our version (POST below), all inside ONE transaction:
//   1. SELECT ... FROM trainers WHERE id = ? FOR UPDATE
//      -> locks that trainer's row. A second booking for the same trainer
//         WAITS here until the first one commits or rolls back.
//   2. Check the rules (working hours, no overlap) with fresh data.
//   3. INSERT the appointment + a history row, then COMMIT (lock released).
//   The second request then continues, sees the new booking in step 2,
//   and gets 409 Conflict.
// Safety net: the UNIQUE key uq_trainer_active_slot in the database.
// =====================================================================
const express = require('express');
const pool = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { withTransaction, HttpError, sendError } = require('../utils/transaction');
const { DURATIONS, assertBookable, now } = require('../utils/schedule');
const { toDateTime, toId, isDate, text, badRequest } = require('../utils/validate');

const router = express.Router();
router.use(requireAuth); // every appointment route needs a logged-in user

const PAGE_SIZE = 20;
const SELECT_APPOINTMENT = `
  SELECT a.id, a.trainer_id, a.member_id, a.starts_at, a.ends_at, a.duration_minutes,
         a.status, a.notes, a.rescheduled_from, a.created_at, a.cancelled_at,
         t.name AS trainer_name, b.name AS branch_name, u.full_name AS member_name, u.email AS member_email
  FROM appointments a
  JOIN trainers t ON t.id = a.trainer_id
  JOIN branches b ON b.id = t.branch_id
  JOIN users u    ON u.id = a.member_id`;

// Load one appointment the caller may see. Members only see their own;
// someone else's appointment answers 404 (not 403) so ids can't be probed.
async function findVisible(db, id, user) {
  const [[row]] = await db.query(`${SELECT_APPOINTMENT} WHERE a.id = ?`, [id]);
  if (!row || (user.role !== 'admin' && row.member_id !== user.id)) {
    throw new HttpError(404, 'Appointment not found');
  }
  return row;
}

async function addHistory(conn, appointmentId, oldStatus, newStatus, userId, note) {
  await conn.query(
    'INSERT INTO appointment_history (appointment_id, old_status, new_status, changed_by, note) VALUES (?, ?, ?, ?, ?)',
    [appointmentId, oldStatus, newStatus, userId, note]
  );
}

// GET /api/appointments
//   member: their own appointments
//   admin:  everyone's, with filters ?status=&trainerId=&date=&page=
router.get('/', async (req, res, next) => {
  const where = [];
  const params = [];
  const { status, date } = req.query;
  const page = req.query.page ? toId(req.query.page) : 1;
  const fields = {};
  if (!page) fields.page = 'page must be a positive number';
  if (status && !['confirmed', 'cancelled', 'completed'].includes(status)) fields.status = 'Unknown status';
  if (date && !isDate(date)) fields.date = 'date must look like 2026-11-20';
  if (req.query.trainerId && !toId(req.query.trainerId)) fields.trainerId = 'Invalid trainer id';
  if (Object.keys(fields).length) return badRequest(res, fields);

  if (req.user.role !== 'admin') {
    where.push('a.member_id = ?');
    params.push(req.user.id);
  }
  if (status) {
    where.push('a.status = ?');
    params.push(status);
  }
  if (req.query.trainerId) {
    where.push('a.trainer_id = ?');
    params.push(toId(req.query.trainerId));
  }
  if (date) {
    where.push('a.starts_at >= ? AND a.starts_at < ? + INTERVAL 1 DAY');
    params.push(`${date} 00:00:00`, `${date} 00:00:00`);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  try {
    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM appointments a ${whereSql}`,
      params
    );
    const [rows] = await pool.query(
      `${SELECT_APPOINTMENT} ${whereSql} ORDER BY a.starts_at DESC LIMIT ? OFFSET ?`,
      [...params, PAGE_SIZE, (page - 1) * PAGE_SIZE]
    );
    res.json({ appointments: rows, page, pageSize: PAGE_SIZE, total });
  } catch (err) {
    next(err);
  }
});

// GET /api/appointments/:id  -> one appointment with its full history
router.get('/:id', async (req, res, next) => {
  const id = toId(req.params.id);
  if (!id) return badRequest(res, { id: 'Invalid id' });
  try {
    const appointment = await findVisible(pool, id, req.user);
    const [history] = await pool.query(
      `SELECT h.id, h.old_status, h.new_status, h.note, h.changed_at, u.full_name AS changed_by_name
       FROM appointment_history h LEFT JOIN users u ON u.id = h.changed_by
       WHERE h.appointment_id = ? ORDER BY h.id`,
      [id]
    );
    res.json({ ...appointment, history });
  } catch (err) {
    sendError(err, res, next);
  }
});

// POST /api/appointments  { trainerId, startsAt, duration, notes? }
router.post('/', async (req, res, next) => {
  if (req.user.role !== 'member') {
    return res.status(403).json({ error: 'Only members can book sessions' });
  }
  const trainerId = toId(req.body.trainerId);
  const startsAt = toDateTime(req.body.startsAt);
  const duration = Number(req.body.duration);
  const notes = req.body.notes ? text(req.body.notes, 1, 500) : null;
  const fields = {};
  if (!trainerId) fields.trainerId = 'Choose a trainer';
  if (!startsAt) fields.startsAt = 'startsAt must look like 2026-11-20 10:30';
  if (!DURATIONS.includes(duration)) fields.duration = 'Duration must be 30, 60 or 90 minutes';
  if (req.body.notes && !notes) fields.notes = 'Notes can be at most 500 characters';
  if (Object.keys(fields).length) return badRequest(res, fields);

  try {
    const id = await withTransaction(async (conn) => {
      // 1. Lock the trainer row. Concurrent bookings for this trainer queue here.
      const [[trainer]] = await conn.query(
        'SELECT id FROM trainers WHERE id = ? AND is_active = TRUE FOR UPDATE',
        [trainerId]
      );
      if (!trainer) throw new HttpError(404, 'Trainer not found');
      // Also lock the member, so one member cannot book two trainers for
      // the same time in two parallel requests. (Always trainer first, then
      // member: a fixed lock order means no deadlocks.)
      await conn.query('SELECT id FROM users WHERE id = ? FOR UPDATE', [req.user.id]);

      // 2. Check every rule against the latest committed data.
      const endsAt = await assertBookable(conn, { trainerId, memberId: req.user.id, startsAt, duration });

      // 3. Save the booking and its first history row.
      const [r] = await conn.query(
        `INSERT INTO appointments (trainer_id, member_id, starts_at, ends_at, duration_minutes, notes)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [trainerId, req.user.id, startsAt, endsAt, duration, notes]
      );
      await addHistory(conn, r.insertId, null, 'confirmed', req.user.id, 'Booked');
      return r.insertId;
    }); // COMMIT happens here and releases the locks

    res.status(201).json(await findVisible(pool, id, req.user));
  } catch (err) {
    sendError(err, res, next);
  }
});

// PATCH /api/appointments/:id  { startsAt, duration? }  -> reschedule
//
// MULTI-ROW TRANSACTION: the old appointment is cancelled AND the new one
// is created together. If the new time is taken, the ROLLBACK undoes the
// cancellation too, so the member never loses their original booking.
router.patch('/:id', async (req, res, next) => {
  const id = toId(req.params.id);
  const startsAt = toDateTime(req.body.startsAt);
  const fields = {};
  if (!id) fields.id = 'Invalid id';
  if (!startsAt) fields.startsAt = 'startsAt must look like 2026-11-20 10:30';
  if (req.body.duration !== undefined && !DURATIONS.includes(Number(req.body.duration))) {
    fields.duration = 'Duration must be 30, 60 or 90 minutes';
  }
  if (Object.keys(fields).length) return badRequest(res, fields);

  try {
    const newId = await withTransaction(async (conn) => {
      const old = await findVisible(conn, id, req.user);
      const duration = req.body.duration !== undefined ? Number(req.body.duration) : old.duration_minutes;

      // Same lock order as booking: trainer, then member.
      await conn.query('SELECT id FROM trainers WHERE id = ? FOR UPDATE', [old.trainer_id]);
      await conn.query('SELECT id FROM users WHERE id = ? FOR UPDATE', [old.member_id]);

      // Re-read the status now that we hold the locks.
      const [[current]] = await conn.query('SELECT status, starts_at FROM appointments WHERE id = ?', [id]);
      if (current.status !== 'confirmed') throw new HttpError(409, `This appointment is already ${current.status}`);
      if (current.starts_at <= now()) throw new HttpError(409, 'Past sessions cannot be rescheduled');

      // Row 1: cancel the old booking (frees its slot).
      await conn.query("UPDATE appointments SET status = 'cancelled', cancelled_at = NOW() WHERE id = ?", [id]);
      await addHistory(conn, id, 'confirmed', 'cancelled', req.user.id, 'Rescheduled');

      // Row 2: create the new booking (throws 409 if the new time is taken -> ROLLBACK).
      const endsAt = await assertBookable(conn, {
        trainerId: old.trainer_id, memberId: old.member_id, startsAt, duration, ignoreId: id,
      });
      const [r] = await conn.query(
        `INSERT INTO appointments (trainer_id, member_id, starts_at, ends_at, duration_minutes, notes, rescheduled_from)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [old.trainer_id, old.member_id, startsAt, endsAt, duration, old.notes, id]
      );
      await addHistory(conn, r.insertId, null, 'confirmed', req.user.id, `Rescheduled from #${id}`);
      return r.insertId;
    });

    res.json(await findVisible(pool, newId, req.user));
  } catch (err) {
    sendError(err, res, next);
  }
});

// DELETE /api/appointments/:id  -> cancel
// The row is kept with status 'cancelled' (history must stay answerable).
router.delete('/:id', async (req, res, next) => {
  const id = toId(req.params.id);
  if (!id) return badRequest(res, { id: 'Invalid id' });
  try {
    await withTransaction(async (conn) => {
      await findVisible(conn, id, req.user);
      // Conditional UPDATE: only a confirmed, future appointment changes.
      // Two cancels at once -> only one of them updates the row.
      const [r] = await conn.query(
        `UPDATE appointments SET status = 'cancelled', cancelled_at = NOW()
         WHERE id = ? AND status = 'confirmed' AND starts_at > ?`,
        [id, now()]
      );
      if (r.affectedRows === 0) throw new HttpError(409, 'Only upcoming confirmed sessions can be cancelled');
      await addHistory(conn, id, 'confirmed', 'cancelled', req.user.id, 'Cancelled');
    });
    res.json(await findVisible(pool, id, req.user));
  } catch (err) {
    sendError(err, res, next);
  }
});

// PATCH /api/appointments/:id/complete  (admin) -> mark a session as done
router.patch('/:id/complete', requireAdmin, async (req, res, next) => {
  const id = toId(req.params.id);
  if (!id) return badRequest(res, { id: 'Invalid id' });
  try {
    await withTransaction(async (conn) => {
      await findVisible(conn, id, req.user);
      const [r] = await conn.query(
        "UPDATE appointments SET status = 'completed' WHERE id = ? AND status = 'confirmed' AND starts_at <= ?",
        [id, now()]
      );
      if (r.affectedRows === 0) throw new HttpError(409, 'Only confirmed sessions that have started can be completed');
      await addHistory(conn, id, 'confirmed', 'completed', req.user.id, 'Session completed');
    });
    res.json(await findVisible(pool, id, req.user));
  } catch (err) {
    sendError(err, res, next);
  }
});

module.exports = router;
