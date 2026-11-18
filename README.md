# FitLean Fitness: gym booking system

A full-stack web application for a chain of gyms. Visitors browse branches, trainers and membership plans
and send enquiries. **Members** sign up and book 1-on-1 sessions (30, 60 or 90 minutes) with a trainer,
then reschedule or cancel them. **Admins** see a dashboard, every appointment, members and enquiries, and
manage trainers.

Full Stack Development project · Karthik Baurai

**Stack:** React (Vite, plain JavaScript) · Node.js + Express · MySQL 8 · bcrypt + JWT · Jest + Supertest · Postman

---

## The hard requirement: concurrency

> **If two members book the same trainer slot at the same moment, a naive version would create two bookings.**

A naive booking runs *check, then insert*: both requests read "the slot is free", then both insert.

FitLean books inside **one transaction** ([`backend/routes/appointments.js`](backend/routes/appointments.js)):

1. `SELECT ... FROM trainers WHERE id = ? FOR UPDATE` **locks the trainer's row**. A second booking for the
   same trainer has to **wait** here until the first one finishes.
2. With the lock held, it checks the rules: working hours, no overlap with the trainer's confirmed sessions,
   no overlap with the member's own sessions.
3. It `INSERT`s the appointment and a history row, then `COMMIT`s, which releases the lock.
4. The waiting request now continues, sees the new booking in step 2, and gets **409 Conflict**.

**Safety net in the database:** the generated column `active_slot` and the key
`UNIQUE (trainer_id, active_slot)` make two confirmed bookings of one trainer at the same start time
impossible even if the code were wrong ([`database/schema.sql`](database/schema.sql)).

The project also covers the other two kinds of hard requirement:

- **Multi-row transaction:** rescheduling cancels the old booking **and** creates the new one in one
  transaction. If the new time is taken, `ROLLBACK` restores the old booking.
- **Append-only history:** every status change is a new row in `appointment_history`. Database triggers
  refuse any `UPDATE` or `DELETE` on that table.

### How it is tested

| Test | What it proves |
|---|---|
| `npm run demo:race` | 10 members `POST` the same slot at the same instant. It prints **"1 succeeded, 9 got 409 Conflict"** and shows exactly 1 row in MySQL |
| `npm test` (Jest) | The same race as an automated test, plus the reschedule rollback and the append-only triggers |
| Postman, folder **4 Conflict** | A second member books a taken or overlapping time: 409 |
| Two browser windows | Open the same trainer and time in two windows (two different members) and press *Confirm* in both: one is booked, the other shows "That time is no longer available" |

---

## Setup

You need **Node.js 18+** and **MySQL 8** (MySQL Workbench is optional).

```bash
# 1. Backend
cd backend
npm install
cp .env.example .env         # then open .env and enter your MySQL password
npm run db:setup             # creates the `fitlean` database, demo data and 5,000+ appointments

# 2. Frontend (in a second terminal)
cd frontend
npm install
```

### Run it (development)

```bash
cd backend  && npm run dev     # API on http://localhost:5000
cd frontend && npm run dev     # website on http://localhost:5173 (calls /api through Vite's proxy)
```

### Run it (one command, for the demo)

```bash
cd frontend && npm run build   # creates frontend/dist
cd backend  && npm start       # API + website together on http://localhost:5000
```

### Demo accounts (fictional, created by `npm run db:setup`)

| Role | Email | Password |
|---|---|---|
| Admin | `admin@fitlean.test` | `Admin@123` |
| Member | `member@fitlean.test` | `Member@123` |
| Second member | `member2@fitlean.test` | `Member@123` |
| 300 volume members | `member001@example.test` … `member300@example.test` | `Member@123` |

`npm run db:setup` **drops and recreates** the `fitlean` database, so run it again whenever you want a clean demo.

### Tests

```bash
cd backend
npm test             # Jest + Supertest (needs MySQL with the demo data)
npm run demo:race    # needs the API running (npm start) in another terminal
```

**Postman:** import [`postman/FitLean.postman_collection.json`](postman/FitLean.postman_collection.json) and run the
folders in order (39 requests, each with a status check). Run `npm run db:setup` before running it a second time.

---

## REST API

All URLs start with `/api`. Send and receive JSON. Protected routes need the header
`Authorization: Bearer <token>` (the token comes from login or register).
Errors always look like `{ "error": "message", "fields": { "field": "message" } }` (`fields` only on 400).

| Method | URL | Who | Success | Errors |
|---|---|---|---|---|
| POST | `/auth/register` | anyone | 201 | 400, 409 |
| POST | `/auth/login` | anyone | 200 | 400, 401 |
| GET | `/auth/me` | logged in | 200 | 401 |
| GET | `/branches` · `/branches/:slug` | anyone | 200 | 404 |
| GET | `/trainers?branchId=` · `/trainers/:idOrSlug` | anyone | 200 | 400, 404 |
| GET | `/trainers/:id/slots?date=&duration=` | anyone | 200 | 400, 404 |
| POST · PUT · DELETE | `/trainers` · `/trainers/:id` | admin | 201 · 200 · 204 | 400, 401, 403, 404, 409 |
| GET | `/plans` | anyone | 200 | |
| POST | `/enquiries` | anyone | 201 | 400 |
| GET · PATCH | `/enquiries` · `/enquiries/:id` | admin | 200 | 400, 401, 403, 404 |
| GET | `/appointments?status=&trainerId=&date=&page=` | member: own · admin: all | 200 | 400, 401 |
| POST | `/appointments` (book) | member | 201 | 400, 401, 403, 404, **409** |
| GET | `/appointments/:id` (with history) | owner or admin | 200 | 401, 404 |
| PATCH | `/appointments/:id` (reschedule) | owner or admin | 200 | 400, 401, 404, **409** |
| DELETE | `/appointments/:id` (cancel) | owner or admin | 200 | 401, 404, 409 |
| PATCH | `/appointments/:id/complete` | admin | 200 | 401, 403, 404, 409 |
| GET | `/users?search=&page=` | admin | 200 | 401, 403 |
| GET | `/stats` | admin | 200 | 401, 403 |

- Cancelling keeps the row with status `cancelled`: the history must stay answerable.
- Someone else's appointment answers **404, not 403**, so appointment ids cannot be probed.

---

## Database

Full details, the ER diagram and the `EXPLAIN` results are in [`docs/DATABASE.md`](docs/DATABASE.md).

- 12 tables, 3rd normal form: many-to-many links (`trainer_specializations`, `plan_features`) are their own
  tables, and no column holds a list.
- Constraints: primary and foreign keys, `UNIQUE` (emails, slugs, one booking per trainer slot), `CHECK`
  (durations 30/60/90, `ends_at = starts_at + duration`, opening hours, prices ≥ 0), `NOT NULL`, `ENUM`s.
- Indexes on `(trainer_id, starts_at)`, `(member_id, starts_at)` and `(status, starts_at)` for the
  queries that run at volume (5,000+ appointments, 10,000+ history rows).
- Passwords are stored only as **bcrypt** hashes (`users.password_hash`), made with the `bcryptjs` package
  (the same bcrypt algorithm written in plain JavaScript, so `npm install` needs no C++ build tools).

## Project structure

```
database/
  schema.sql            tables, constraints, indexes, triggers
  seed.sql              branches, trainers, plans (fictional demo data)
backend/
  server.js             starts the server
  app.js                Express app: middleware + routes
  db.js                 MySQL connection pool
  middleware/auth.js    requireAuth / requireAdmin (JWT)
  routes/               one file per resource (auth, trainers, appointments ...)
  utils/                validation, transactions, booking rules
  scripts/              setup-db.js (create + seed), race-demo.js
  tests/                Jest + Supertest
frontend/
  src/api.js            fetch helper (adds the token, handles errors)
  src/context/          AuthContext (who is logged in)
  src/components/       navbar, footer, form fields, slot picker ...
  src/pages/            public, member and admin pages
postman/                Postman collection
docs/                   database notes and viva notes
```

Secrets live only in `backend/.env`, which Git ignores; `backend/.env.example` lists the names.
