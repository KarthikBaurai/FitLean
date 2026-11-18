// LIVE DEMO of the hard requirement.
//
//   1. start the API:   npm start
//   2. in a 2nd terminal: npm run demo:race
//
// Ten different members try to book THE SAME trainer at THE SAME time, all
// at the same instant (Promise.all fires the ten requests in parallel).
// Expected: exactly 1 booking succeeds (201) and 9 get 409 Conflict.
const pool = require('../db');

const API = process.env.API_URL || `http://localhost:${process.env.PORT || 5000}/api`;
const TRAINER_ID = 2;
const RACERS = 10;

async function post(path, body, token) {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json() };
}

async function main() {
  // Log in ten demo members (created by npm run db:setup).
  const tokens = [];
  for (let i = 1; i <= RACERS; i++) {
    const email = `member${String(i).padStart(3, '0')}@example.test`;
    const { status, body } = await post('/auth/login', { email, password: 'Member@123' });
    if (status !== 200) throw new Error(`Login failed for ${email}: ${body.error}`);
    tokens.push(body.token);
  }

  // Find a free 60-minute slot for the trainer, searching the next 14 days.
  let slot;
  for (let d = 2; d <= 14 && !slot; d++) {
    const day = new Date();
    day.setDate(day.getDate() + d);
    const date = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
    const res = await fetch(`${API}/trainers/${TRAINER_ID}/slots?date=${date}&duration=60`);
    const slots = await res.json();
    slot = slots[slots.length - 1];
  }
  if (!slot) throw new Error('No free slot found');
  console.log(`\n${RACERS} members book trainer #${TRAINER_ID} at ${slot.startsAt} at the same instant...\n`);

  // Fire all ten requests at once.
  const results = await Promise.all(
    tokens.map((token) => post('/appointments', { trainerId: TRAINER_ID, startsAt: slot.startsAt, duration: 60 }, token))
  );
  results.forEach((r, i) => {
    const text = r.status === 201 ? `BOOKED (appointment #${r.body.id})` : r.body.error;
    console.log(`  member ${String(i + 1).padStart(2)}: ${r.status}  ${text}`);
  });

  const ok = results.filter((r) => r.status === 201).length;
  const conflicts = results.filter((r) => r.status === 409).length;
  console.log(`\nResult: ${ok} succeeded, ${conflicts} got 409 Conflict.`);

  // Prove it in the database itself.
  const [[{ n }]] = await pool.query(
    "SELECT COUNT(*) AS n FROM appointments WHERE trainer_id = ? AND status = 'confirmed' AND starts_at < ? AND ends_at > ?",
    [TRAINER_ID, slot.endsAt, slot.startsAt]
  );
  console.log(`Database: ${n} confirmed appointment(s) for that trainer at that time.\n`);
  await pool.end();
  process.exit(ok === 1 && n === 1 ? 0 : 1);
}

main().catch(async (err) => {
  console.error('Race demo failed:', err.message, '\n(Is the API running? Start it with npm start.)');
  await pool.end();
  process.exit(1);
});
