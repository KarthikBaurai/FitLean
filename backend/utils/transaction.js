// Runs `work(conn)` inside one database transaction.
//
//   BEGIN  ->  work(conn)  ->  COMMIT      (everything is saved together)
//                    \-> error -> ROLLBACK  (nothing is saved at all)
//
// READ COMMITTED: every SELECT inside the transaction sees the newest
// committed rows. Together with SELECT ... FOR UPDATE this means that when
// we finally get a lock, we also see the booking the previous lock holder
// just committed.
const pool = require('../db');

async function withTransaction(work) {
  const conn = await pool.getConnection();
  try {
    await conn.query('SET TRANSACTION ISOLATION LEVEL READ COMMITTED');
    await conn.beginTransaction();
    const result = await work(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

// An error that carries the HTTP status code to send back.
class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// Turns errors thrown inside a route into the right HTTP response.
function sendError(err, res, next) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message });
  }
  // The database UNIQUE key refused a second booking of the same slot.
  if (err.code === 'ER_DUP_ENTRY' && err.message.includes('uq_trainer_active_slot')) {
    return res.status(409).json({ error: 'That time was just booked by someone else' });
  }
  if (err.code === 'ER_LOCK_DEADLOCK' || err.code === 'ER_LOCK_WAIT_TIMEOUT') {
    return res.status(409).json({ error: 'The system is busy, please try again' });
  }
  next(err);
}

module.exports = { withTransaction, HttpError, sendError };
