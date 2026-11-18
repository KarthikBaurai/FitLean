// API tests (Jest + Supertest). They call the Express app directly and use
// the real MySQL database, so run `npm run db:setup` first, then `npm test`.
require('dotenv').config();
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

const request = require('supertest');
const app = require('../app');
const pool = require('../db');

const login = async (email, password = 'Member@123') =>
  (await request(app).post('/api/auth/login').send({ email, password })).body.token;

// A brand-new member for each test, so tests never clash and can be re-run.
let counter = 0;
async function newMember() {
  counter += 1;
  const email = `test-${Date.now()}-${counter}@example.test`;
  const res = await request(app).post('/api/auth/register').send({ fullName: 'Test Member', email, password: 'Test1234' });
  return res.body.token;
}

// First free 60-minute slot for a trainer, 2-20 days from now.
async function freeSlot(trainerId) {
  for (let d = 2; d <= 20; d++) {
    const day = new Date();
    day.setDate(day.getDate() + d);
    const date = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
    const res = await request(app).get(`/api/trainers/${trainerId}/slots?date=${date}&duration=60`);
    if (res.body.length > 0) return res.body[0];
  }
  throw new Error('no free slot');
}

let member;
let member2;
let admin;

beforeAll(async () => {
  member = await login('member@fitlean.test');
  member2 = await login('member2@fitlean.test');
  admin = await login('admin@fitlean.test', 'Admin@123');
});

afterAll(() => pool.end());

describe('public reads', () => {
  test('GET /api/trainers lists active trainers with specialisations', async () => {
    const res = await request(app).get('/api/trainers');
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    expect(Array.isArray(res.body[0].specializations)).toBe(true);
  });

  test('unknown trainer -> 404', async () => {
    const res = await request(app).get('/api/trainers/no-such-trainer');
    expect(res.status).toBe(404);
  });
});

describe('server-side validation (requests that bypass the website)', () => {
  test('booking with bad fields -> 400 with a message per field', async () => {
    const res = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${member}`)
      .send({ trainerId: 'abc', startsAt: 'tomorrow', duration: 45 });
    expect(res.status).toBe(400);
    expect(Object.keys(res.body.fields).sort()).toEqual(['duration', 'startsAt', 'trainerId']);
  });

  test('booking outside working hours -> 400', async () => {
    const slot = await freeSlot(5);
    const res = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${member}`)
      .send({ trainerId: 5, startsAt: `${slot.startsAt.slice(0, 10)} 06:00`, duration: 60 });
    expect(res.status).toBe(400);
  });

  test('register with a weak password -> 400', async () => {
    const res = await request(app).post('/api/auth/register').send({ fullName: 'A B', email: 'a@b.co', password: 'short' });
    expect(res.status).toBe(400);
    expect(res.body.fields.password).toBeDefined();
  });

  test('register with an existing email -> 409', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ fullName: 'Copy Cat', email: 'member@fitlean.test', password: 'abcd1234' });
    expect(res.status).toBe(409);
  });
});

describe('authentication and roles', () => {
  test('no token -> 401', async () => {
    expect((await request(app).get('/api/appointments')).status).toBe(401);
  });

  test('wrong password -> 401', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'member@fitlean.test', password: 'nope1234' });
    expect(res.status).toBe(401);
  });

  test('member on an admin route -> 403', async () => {
    const res = await request(app).get('/api/stats').set('Authorization', `Bearer ${member}`);
    expect(res.status).toBe(403);
  });

  test("another member's appointment -> 404", async () => {
    const mine = await request(app).get('/api/appointments').set('Authorization', `Bearer ${member}`);
    const id = mine.body.appointments[0].id;
    const res = await request(app).get(`/api/appointments/${id}`).set('Authorization', `Bearer ${member2}`);
    expect(res.status).toBe(404);
  });
});

describe('HARD REQUIREMENT: concurrent booking', () => {
  test('book a free slot -> 201, the same slot again -> 409', async () => {
    const [p1, p2] = [await newMember(), await newMember()];
    const slot = await freeSlot(6);
    const body = { trainerId: 6, startsAt: slot.startsAt, duration: 60 };
    const first = await request(app).post('/api/appointments').set('Authorization', `Bearer ${p1}`).send(body);
    expect(first.status).toBe(201);
    const second = await request(app).post('/api/appointments').set('Authorization', `Bearer ${p2}`).send(body);
    expect(second.status).toBe(409);
  });

  test('10 members book the same slot at the same instant -> exactly 1 succeeds', async () => {
    const tokens = [];
    for (let i = 0; i < 10; i++) tokens.push(await newMember());
    const slot = await freeSlot(5);
    const results = await Promise.all(
      tokens.map((t) =>
        request(app).post('/api/appointments').set('Authorization', `Bearer ${t}`)
          .send({ trainerId: 5, startsAt: slot.startsAt, duration: 60 })
      )
    );
    const statuses = results.map((r) => r.status);
    expect(statuses.filter((s) => s === 201)).toHaveLength(1);
    expect(statuses.filter((s) => s === 409)).toHaveLength(9);

    const [[{ n }]] = await pool.query(
      "SELECT COUNT(*) AS n FROM appointments WHERE trainer_id = 5 AND status = 'confirmed' AND starts_at < ? AND ends_at > ?",
      [slot.endsAt, slot.startsAt]
    );
    expect(n).toBe(1);
  });
});

describe('multi-row transaction: reschedule', () => {
  test('reschedule onto a taken time -> 409 and the original booking is untouched', async () => {
    const alice = await newMember();
    const bob = await newMember();
    const a = await freeSlot(4);
    const mine = await request(app).post('/api/appointments').set('Authorization', `Bearer ${alice}`)
      .send({ trainerId: 4, startsAt: a.startsAt, duration: 60 });
    expect(mine.status).toBe(201);
    const b = await freeSlot(4);
    const theirs = await request(app).post('/api/appointments').set('Authorization', `Bearer ${bob}`)
      .send({ trainerId: 4, startsAt: b.startsAt, duration: 60 });
    expect(theirs.status).toBe(201);

    const res = await request(app).patch(`/api/appointments/${mine.body.id}`).set('Authorization', `Bearer ${alice}`)
      .send({ startsAt: b.startsAt });
    expect(res.status).toBe(409);

    const after = await request(app).get(`/api/appointments/${mine.body.id}`).set('Authorization', `Bearer ${alice}`);
    expect(after.body.status).toBe('confirmed'); // the ROLLBACK undid the cancellation
    expect(after.body.starts_at).toBe(a.startsAt);
  });
});

describe('append-only history', () => {
  test('the database refuses UPDATE and DELETE on appointment_history', async () => {
    await expect(pool.query("UPDATE appointment_history SET note = 'changed' WHERE id = 1")).rejects.toThrow(/append-only/);
    await expect(pool.query('DELETE FROM appointment_history WHERE id = 1')).rejects.toThrow(/append-only/);
  });

  test('cancelling adds a history row and keeps the appointment', async () => {
    const carol = await newMember();
    const slot = await freeSlot(3);
    const booked = await request(app).post('/api/appointments').set('Authorization', `Bearer ${carol}`)
      .send({ trainerId: 3, startsAt: slot.startsAt, duration: 60 });
    expect(booked.status).toBe(201);
    const cancel = await request(app).delete(`/api/appointments/${booked.body.id}`).set('Authorization', `Bearer ${carol}`);
    expect(cancel.status).toBe(200);
    expect(cancel.body.status).toBe('cancelled');
    const again = await request(app).delete(`/api/appointments/${booked.body.id}`).set('Authorization', `Bearer ${carol}`);
    expect(again.status).toBe(409);

    const detail = await request(app).get(`/api/appointments/${booked.body.id}`).set('Authorization', `Bearer ${admin}`);
    expect(detail.body.history.map((h) => h.new_status)).toEqual(['confirmed', 'cancelled']);
  });
});
