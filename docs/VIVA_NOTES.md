# Viva notes

A short guide to presenting the project and answering the likely questions.

## 5-minute demo script

1. **Website as a visitor:** Trainers → a trainer profile → *See free times*.
2. **Sign in** as `member@fitlean.test` / `Member@123`, book a time, then open *My sessions* and show the
   history timeline.
3. **Reschedule** that booking. Show that the new booking says "Rescheduled from #…" and that the old one is
   now cancelled.
4. **The race:** in a terminal run `npm run demo:race`: *"1 succeeded, 9 got 409 Conflict"* and 1 row in
   the database.
5. **Two browsers:** a normal window signed in as `member@…` and a private window signed in as `member2@…`.
   Same trainer, same day, same time, then press *Confirm* in both. One booking succeeds; the other says
   *"That time is no longer available"*.
6. **Postman:** run folders 4 to 6 to show 409, 400 and 401/403 when the website is bypassed.
7. **Admin** (`admin@fitlean.test` / `Admin@123`): dashboard numbers, filter appointments, add a trainer.

## Walk through the code in this order

1. `database/schema.sql`: tables, constraints, the `active_slot` safety net, the append-only triggers
2. `backend/app.js`: how Express is wired (middleware, one router per resource)
3. `backend/middleware/auth.js`: JWT check, 401 vs 403
4. `backend/routes/appointments.js` **POST**: the transaction, `FOR UPDATE`, the 409
5. `backend/utils/schedule.js`: the overlap rule `start < otherEnd AND otherStart < end`
6. `frontend/src/api.js` → `pages/Book.jsx`: how the page calls the API and shows the 409 message

## Likely questions

**What is a transaction for?**
To make several changes count as one: either all of them are saved (`COMMIT`) or none (`ROLLBACK`).
Rescheduling cancels one row and inserts another; if the insert fails, the cancel is undone too.

**Why does the naive version double-book?**
Two requests both run `SELECT` ("is it free?") before either runs `INSERT`. Both see "free", both insert.
The gap between the check and the insert is the race condition.

**What does `SELECT ... FOR UPDATE` do?**
It reads the row and locks it until the transaction ends. Another transaction that wants the same lock
waits. We lock the trainer's row, so all bookings for one trainer happen one at a time, while bookings for
different trainers still run in parallel.

**Why lock the trainer and not the appointment?**
The appointment doesn't exist yet, so there is nothing to lock. The trainer row is one row that every
booking for that trainer must touch.

**Why READ COMMITTED?**
After we get the lock we must see the booking the previous transaction just committed. Under READ
COMMITTED every `SELECT` reads the latest committed data.

**What if the code had a bug and skipped the lock?**
The `UNIQUE (trainer_id, active_slot)` key still refuses a second confirmed booking at the same start time
(`ER_DUP_ENTRY`, which the API turns into 409).

**Could two bookings deadlock?**
Locks are always taken in the same order (trainer, then member), so no circular wait is possible. If MySQL
ever reports a deadlock anyway, the API answers 409 "please try again".

**Why are cancelled appointments kept?**
History must stay answerable ("who cancelled, and when?"). Rows change status; they are never deleted.
`appointment_history` can't even be updated: triggers raise an error.

**How are passwords stored?**
`bcrypt.hash(password, 10)`, a one-way hash with a random salt and cost factor 10. Login uses
`bcrypt.compare`. The plain password is never stored or logged. The package is `bcryptjs`: the same bcrypt
algorithm in pure JavaScript, chosen so installing the project never needs C++ build tools.

**How does login work?**
Login returns a JWT signed with `JWT_SECRET` containing `{ id, role }`. The browser sends it in the
`Authorization: Bearer …` header. `requireAuth` verifies the signature: no or invalid token → 401.
`requireAdmin` checks the role: wrong role → 403.

**Why validate on the server if the form already validates?**
Anyone can send requests without the website (Postman, curl). Every route checks its input and answers 400
with a message per field before touching the database.

**401 vs 403 vs 404 vs 409?**
401: who are you? (no or bad token). 403: I know you, but you may not. 404: not found, also used for
another member's appointment so ids can't be probed. 409: the request is valid but conflicts with the
current state (slot taken, already cancelled, email already registered).

**How does it handle 5,000+ rows?**
Indexes on `(trainer_id, starts_at)`, `(member_id, starts_at)` and `(status, starts_at)`, plus `LIMIT` /
`OFFSET` pagination. `EXPLAIN` shows index lookups instead of full scans (see `docs/DATABASE.md`).

**Why is there no Supabase / Railway any more?**
The brief asks for a local Express API on a real SQL database, kept on GitHub. The project now runs
entirely on your machine: MySQL, Node and the browser.
