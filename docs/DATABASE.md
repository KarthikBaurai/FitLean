# Database design

MySQL 8, InnoDB. The whole schema is in [`database/schema.sql`](../database/schema.sql).

## ER diagram

```mermaid
erDiagram
  branches ||--o{ trainers : employs
  trainers ||--o{ trainer_specializations : has
  specializations ||--o{ trainer_specializations : "given to"
  trainers ||--o{ trainer_availability : "works (weekly hours)"
  trainers ||--o{ appointments : runs
  users ||--o{ appointments : books
  appointments ||--o{ appointment_history : "status changes"
  users ||--o{ appointment_history : "changed by"
  appointments |o--o| appointments : "rescheduled from"
  membership_plans ||--o{ plan_features : includes
  features ||--o{ plan_features : "part of"

  users {
    int id PK
    varchar full_name
    varchar email UK
    char password_hash "bcrypt, 60 chars"
    varchar phone
    enum role "member | admin"
    datetime created_at
  }
  branches {
    int id PK
    varchar slug UK
    varchar name
    varchar address
    varchar city
    time opens_at
    time closes_at
    boolean is_active
  }
  trainers {
    int id PK
    int branch_id FK
    varchar slug UK
    varchar name
    varchar title
    text bio
    tinyint experience_years
    boolean is_active
  }
  specializations {
    int id PK
    varchar name UK
  }
  trainer_specializations {
    int trainer_id PK,FK
    int specialization_id PK,FK
  }
  trainer_availability {
    int id PK
    int trainer_id FK
    tinyint weekday "1-7"
    time start_time
    time end_time
  }
  appointments {
    int id PK
    int trainer_id FK
    int member_id FK
    datetime starts_at
    datetime ends_at
    smallint duration_minutes "30 | 60 | 90"
    enum status "confirmed | cancelled | completed"
    varchar notes
    int rescheduled_from FK
    datetime active_slot "generated"
  }
  appointment_history {
    bigint id PK
    int appointment_id FK
    varchar old_status
    varchar new_status
    int changed_by FK
    varchar note
    datetime changed_at
  }
  membership_plans {
    int id PK
    varchar slug UK
    varchar name
    decimal price
    enum billing_period
    boolean is_popular
  }
  features {
    int id PK
    varchar title UK
  }
  plan_features {
    int plan_id PK,FK
    int feature_id PK,FK
  }
  enquiries {
    int id PK
    varchar full_name
    varchar email
    enum goal
    varchar message
    enum status "new | contacted | closed"
  }
```

## Constraints and why each one exists

| Table | Constraint | Why |
|---|---|---|
| `users` | `UNIQUE (email)` | One account per email. Register answers 409 on a duplicate |
| `users` | `CHECK (CHAR_LENGTH(TRIM(full_name)) >= 2)` | No blank names, even if the API had a bug |
| `branches` | `CHECK (opens_at < closes_at)` | A branch cannot close before it opens |
| `trainers` | `FOREIGN KEY (branch_id)` | Every trainer belongs to a real branch |
| `trainer_availability` | `UNIQUE (trainer_id, weekday)`, `CHECK (weekday BETWEEN 1 AND 7)`, `CHECK (start_time < end_time)` | One working window per day, valid days and times |
| `membership_plans` | `CHECK (price >= 0)` | No negative prices |
| `appointments` | `CHECK (duration_minutes IN (30, 60, 90))` | Only the session lengths we sell |
| `appointments` | `CHECK (ends_at = starts_at + INTERVAL duration_minutes MINUTE)` | The end time can never disagree with the duration |
| `appointments` | **`UNIQUE (trainer_id, active_slot)`** | Safety net for the hard requirement: two confirmed bookings of one trainer at the same start time are impossible. `active_slot` is `starts_at` while confirmed and `NULL` otherwise, and `UNIQUE` allows many `NULL`s, so cancelled rows don't block the slot |
| `appointments` | `FOREIGN KEY (rescheduled_from)` | Links a rescheduled booking to the one it replaced |
| `appointment_history` | Triggers `trg_history_no_update`, `trg_history_no_delete` | Append-only: the past can never be rewritten |

Things the database cannot express on its own (overlapping *ranges*, working hours) are checked by the
API **inside the locked transaction** (`backend/utils/schedule.js`, `assertBookable`).

## Normalisation

- **1NF:** every column holds one value. A trainer's specialisations are rows in `trainer_specializations`,
  not a comma-separated column.
- **2NF / 3NF:** every non-key column depends only on its table's key. Branch details live only in
  `branches`; an appointment stores `trainer_id`, and the branch is found through the trainer.
- **History is not duplicated state:** `appointments.status` is the current status;
  `appointment_history` is the log of how it got there.

## Transactions and locking

| Operation | Rows changed together | Locks |
|---|---|---|
| Book | `appointments` + `appointment_history` | trainer row, then member row (`FOR UPDATE`) |
| Reschedule | old appointment → cancelled, new appointment inserted, 2 history rows | trainer, then member |
| Cancel / complete | `appointments` + `appointment_history` | conditional `UPDATE ... WHERE status = 'confirmed'` |
| Create / edit trainer | `trainers` + `trainer_specializations` (+ `trainer_availability` on create) | none needed |

- Isolation level **READ COMMITTED** (`backend/utils/transaction.js`): once a request gets the trainer lock,
  its `SELECT`s see the booking the previous lock holder just committed.
- Locks are always taken in the same order (**trainer, then member**), so two bookings can never wait for
  each other in a circle, which means no deadlocks.

## Volume and indexes

`npm run db:setup` creates about **5,500 appointments** and **11,000 history rows** for 300 members.

| Query (where it runs) | Index used | `EXPLAIN` result |
|---|---|---|
| Overlap check while booking: `WHERE trainer_id = ? AND status = 'confirmed' AND starts_at < ? AND ends_at > ?` | `idx_appointments_status_time` / `idx_appointments_trainer_time` | `range`, ~12 rows examined instead of 5,500 |
| My sessions: `WHERE member_id = ? ORDER BY starts_at DESC LIMIT 20` | `idx_appointments_member_time` | `ref`, ~18 rows, no filesort (backward index scan) |
| Admin list: `WHERE status = ? ORDER BY starts_at DESC LIMIT 20 OFFSET 40` | `idx_appointments_status_time` | `ref`, no filesort, so the sort comes free from the index |

To see it yourself in MySQL Workbench:

```sql
USE fitlean;
EXPLAIN SELECT * FROM appointments WHERE member_id = 50 ORDER BY starts_at DESC LIMIT 20;
```

Without the index the same query reads every row and then sorts them. Compare:

```sql
EXPLAIN SELECT * FROM appointments IGNORE INDEX (idx_appointments_member_time)
WHERE member_id = 50 ORDER BY starts_at DESC LIMIT 20;
-- type = ALL, rows ≈ 5,850, Extra = "Using where; Using filesort"
```
