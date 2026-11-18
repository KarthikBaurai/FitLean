// Booking rules, shared by "show free times" and "book a time".
//
// Times are strings in gym-local time: "2026-11-20 10:30:00".
// Strings in this format compare correctly with < and >.
const { HttpError } = require('./transaction');

const DURATIONS = [30, 60, 90]; // minutes
const SLOT_STEP = 30; // sessions start on the hour or half hour
const MIN_NOTICE_MINUTES = 30; // cannot book a session starting in < 30 min
const HORIZON_DAYS = 30; // cannot book more than 30 days ahead

function pad(n) {
  return String(n).padStart(2, '0');
}

function format(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}:00`;
}

// "2026-11-20 10:30:00" + 60 -> "2026-11-20 11:30:00"
function addMinutes(dateTime, minutes) {
  const d = new Date(dateTime.replace(' ', 'T'));
  d.setMinutes(d.getMinutes() + minutes);
  return format(d);
}

function now() {
  return format(new Date());
}

// ISO weekday of "2026-11-20": 1 = Monday ... 7 = Sunday
function weekday(date) {
  const day = new Date(`${date}T00:00:00`).getDay();
  return day === 0 ? 7 : day;
}

// All free start times for one trainer, date and duration.
async function freeSlots(db, trainerId, date, duration) {
  const [[hours]] = await db.query(
    'SELECT start_time, end_time FROM trainer_availability WHERE trainer_id = ? AND weekday = ?',
    [trainerId, weekday(date)]
  );
  if (!hours) return []; // trainer does not work that day

  const [booked] = await db.query(
    `SELECT starts_at, ends_at FROM appointments
     WHERE trainer_id = ? AND status = 'confirmed'
       AND starts_at < ? AND ends_at > ?`,
    [trainerId, `${date} 23:59:59`, `${date} 00:00:00`]
  );

  const earliest = addMinutes(now(), MIN_NOTICE_MINUTES);
  const latest = addMinutes(now(), HORIZON_DAYS * 24 * 60);
  const slots = [];
  let start = `${date} ${hours.start_time}`;
  const dayEnd = `${date} ${hours.end_time}`;
  while (addMinutes(start, duration) <= dayEnd) {
    const end = addMinutes(start, duration);
    // Two sessions overlap when each one starts before the other ends.
    const taken = booked.some((b) => start < b.ends_at && b.starts_at < end);
    if (!taken && start >= earliest && start <= latest) {
      slots.push({ startsAt: start, endsAt: end });
    }
    start = addMinutes(start, SLOT_STEP);
  }
  return slots;
}

// Checks every booking rule. Throws HttpError(400 / 409) if one fails.
// Called INSIDE the booking transaction, after the trainer row is locked,
// so nobody can change the trainer's schedule while we check.
// `ignoreId` skips the appointment being rescheduled.
async function assertBookable(conn, { trainerId, memberId, startsAt, duration, ignoreId = 0 }) {
  const endsAt = addMinutes(startsAt, duration);
  const minute = Number(startsAt.slice(14, 16));

  if (!DURATIONS.includes(duration)) throw new HttpError(400, 'Duration must be 30, 60 or 90 minutes');
  if (minute % SLOT_STEP !== 0) throw new HttpError(400, 'Sessions start on the hour or half hour');
  if (startsAt < addMinutes(now(), MIN_NOTICE_MINUTES)) {
    throw new HttpError(400, `Sessions must be booked at least ${MIN_NOTICE_MINUTES} minutes ahead`);
  }
  if (startsAt > addMinutes(now(), HORIZON_DAYS * 24 * 60)) {
    throw new HttpError(400, `Sessions can be booked at most ${HORIZON_DAYS} days ahead`);
  }

  const date = startsAt.slice(0, 10);
  const [[hours]] = await conn.query(
    'SELECT start_time, end_time FROM trainer_availability WHERE trainer_id = ? AND weekday = ?',
    [trainerId, weekday(date)]
  );
  if (!hours || startsAt < `${date} ${hours.start_time}` || endsAt > `${date} ${hours.end_time}`) {
    throw new HttpError(400, "That time is outside the trainer's working hours");
  }

  // Overlap rule: existing.start < new.end AND new.start < existing.end
  const [[trainerClash]] = await conn.query(
    `SELECT COUNT(*) AS n FROM appointments
     WHERE trainer_id = ? AND status = 'confirmed' AND id <> ?
       AND starts_at < ? AND ends_at > ?`,
    [trainerId, ignoreId, endsAt, startsAt]
  );
  if (trainerClash.n > 0) throw new HttpError(409, 'That time is no longer available');

  const [[memberClash]] = await conn.query(
    `SELECT COUNT(*) AS n FROM appointments
     WHERE member_id = ? AND status = 'confirmed' AND id <> ?
       AND starts_at < ? AND ends_at > ?`,
    [memberId, ignoreId, endsAt, startsAt]
  );
  if (memberClash.n > 0) throw new HttpError(409, 'You already have a session at that time');

  return endsAt;
}

module.exports = { DURATIONS, freeSlots, assertBookable, addMinutes, now };
