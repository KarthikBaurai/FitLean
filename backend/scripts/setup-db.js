// Creates the database from scratch and fills it with demo data.
//
//   npm run db:setup
//
// 1. runs database/schema.sql  (DROPS and recreates the `fitlean` database)
// 2. runs database/seed.sql    (branches, trainers, plans ...)
// 3. creates the demo users with bcrypt-hashed passwords
// 4. creates 5,000+ past appointments (+ history) so the app can be
//    tested at volume, and a few upcoming bookings for the demo member.
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const DB_DIR = path.join(__dirname, '..', '..', 'database');
const VOLUME_MEMBERS = 300;
const VOLUME_DAYS = 220; // how many days back the history goes

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true, // needed to run whole .sql files
    dateStrings: true,
  });

  console.log('1/4 Creating schema ...');
  await conn.query(fs.readFileSync(path.join(DB_DIR, 'schema.sql'), 'utf8'));

  console.log('2/4 Loading seed data ...');
  await conn.query(fs.readFileSync(path.join(DB_DIR, 'seed.sql'), 'utf8'));
  await conn.query('USE fitlean');

  console.log('3/4 Creating users (bcrypt) ...');
  const adminHash = await bcrypt.hash('Admin@123', 10);
  const memberHash = await bcrypt.hash('Member@123', 10);
  const users = [
    ['FitLean Admin', 'admin@fitlean.test', adminHash, 'admin'],
    ['Demo Member', 'member@fitlean.test', memberHash, 'member'],
    ['Second Member', 'member2@fitlean.test', memberHash, 'member'],
  ];
  for (let i = 1; i <= VOLUME_MEMBERS; i++) {
    const n = String(i).padStart(3, '0');
    users.push([`Volume Member ${n}`, `member${n}@example.test`, memberHash, 'member']);
  }
  await conn.query('INSERT INTO users (full_name, email, password_hash, role) VALUES ?', [users]);
  const [[{ firstVolumeId }]] = await conn.query(
    "SELECT MIN(id) AS firstVolumeId FROM users WHERE email LIKE 'member%@example.test'"
  );

  console.log('4/4 Creating volume appointments ...');
  const [trainers] = await conn.query('SELECT id FROM trainers ORDER BY id');
  const appointments = [];
  const history = [];
  let id = 0;
  const today = new Date();
  for (let d = VOLUME_DAYS; d >= 1; d--) {
    const day = new Date(today.getFullYear(), today.getMonth(), today.getDate() - d);
    if (day.getDay() === 0) continue; // trainers do not work on Sunday
    const date = ymd(day);
    for (let hour = 9; hour <= 16; hour++) {
      // Each trainer gets a different member in the same hour, so no member
      // is ever in two places at once, and hourly 60-minute sessions never
      // overlap for the same trainer.
      const base = Math.floor(Math.random() * VOLUME_MEMBERS);
      trainers.forEach((t, i) => {
        if (Math.random() < 0.35) return; // leave some hours free
        id += 1;
        const memberId = firstVolumeId + ((base + i) % VOLUME_MEMBERS);
        const start = `${date} ${String(hour).padStart(2, '0')}:00:00`;
        const end = `${date} ${String(hour + 1).padStart(2, '0')}:00:00`;
        const status = Math.random() < 0.9 ? 'completed' : 'cancelled';
        appointments.push([id, t.id, memberId, start, end, 60, status, status === 'cancelled' ? end : null]);
        history.push([id, null, 'confirmed', memberId, 'Booked', start]);
        history.push([id, 'confirmed', status, null, status === 'completed' ? 'Session completed' : 'Cancelled by member', end]);
      });
    }
  }
  await insertInBatches(
    conn,
    'INSERT INTO appointments (id, trainer_id, member_id, starts_at, ends_at, duration_minutes, status, cancelled_at) VALUES ?',
    appointments
  );
  await insertInBatches(
    conn,
    'INSERT INTO appointment_history (appointment_id, old_status, new_status, changed_by, note, changed_at) VALUES ?',
    history
  );

  // A few upcoming confirmed bookings for the demo member (next Mon/Tue).
  const nextMonday = new Date(today.getFullYear(), today.getMonth(), today.getDate() + ((8 - today.getDay()) % 7 || 7));
  const nextTuesday = new Date(nextMonday.getFullYear(), nextMonday.getMonth(), nextMonday.getDate() + 1);
  const upcoming = [
    [1, `${ymd(nextMonday)} 10:00:00`, `${ymd(nextMonday)} 11:00:00`, 60],
    [3, `${ymd(nextTuesday)} 15:00:00`, `${ymd(nextTuesday)} 15:30:00`, 30],
  ];
  const [[demo]] = await conn.query("SELECT id FROM users WHERE email = 'member@fitlean.test'");
  for (const [trainerId, start, end, minutes] of upcoming) {
    const [r] = await conn.query(
      'INSERT INTO appointments (trainer_id, member_id, starts_at, ends_at, duration_minutes, notes) VALUES (?, ?, ?, ?, ?, ?)',
      [trainerId, demo.id, start, end, minutes, 'Demo booking']
    );
    await conn.query(
      "INSERT INTO appointment_history (appointment_id, old_status, new_status, changed_by, note) VALUES (?, NULL, 'confirmed', ?, 'Booked')",
      [r.insertId, demo.id]
    );
  }

  // A few enquiries for the admin screen.
  await conn.query(
    `INSERT INTO enquiries (full_name, email, phone, goal, message, status) VALUES
     ('Asha Mehta', 'asha@example.test', '+91 98100 00001', 'Weight Loss', 'I would like to know about the Pro plan.', 'new'),
     ('Kabir Khan', 'kabir@example.test', NULL, 'Strength', 'Do you offer powerlifting coaching on weekends?', 'contacted')`
  );

  const [[counts]] = await conn.query(
    `SELECT (SELECT COUNT(*) FROM users) AS users,
            (SELECT COUNT(*) FROM appointments) AS appointments,
            (SELECT COUNT(*) FROM appointment_history) AS history`
  );
  console.log(`Done. users=${counts.users}, appointments=${counts.appointments}, history rows=${counts.history}`);
  console.log('Log in as  admin@fitlean.test / Admin@123   or   member@fitlean.test / Member@123');
  await conn.end();
}

function ymd(date) {
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${m}-${d}`;
}

async function insertInBatches(conn, sql, rows, size = 1000) {
  for (let i = 0; i < rows.length; i += size) {
    await conn.query(sql, [rows.slice(i, i + size)]);
  }
}

main().catch((err) => {
  console.error('Database setup failed:', err.message);
  process.exit(1);
});
