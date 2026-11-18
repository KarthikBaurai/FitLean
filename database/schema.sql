-- =====================================================================
-- FitLean Fitness: MySQL 8 schema
--
-- Run with:   mysql -u root -p < database/schema.sql
-- (or `npm run db:setup` in backend/, which also loads the seed data)
--
-- All times are stored as the gym's local time (DATETIME, no time zone).
-- =====================================================================

DROP DATABASE IF EXISTS fitlean;
CREATE DATABASE fitlean CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE fitlean;

-- ---------------------------------------------------------------------
-- 1. Users (members and admins)
--    Passwords are stored ONLY as bcrypt hashes (always 60 characters).
-- ---------------------------------------------------------------------
CREATE TABLE users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  full_name     VARCHAR(100) NOT NULL,
  email         VARCHAR(254) NOT NULL,
  password_hash CHAR(60)     NOT NULL,
  phone         VARCHAR(20)  NULL,
  role          ENUM('member', 'admin') NOT NULL DEFAULT 'member',
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_users_email UNIQUE (email),
  CONSTRAINT chk_users_name CHECK (CHAR_LENGTH(TRIM(full_name)) >= 2)
);

-- ---------------------------------------------------------------------
-- 2. Branches (gym locations)
-- ---------------------------------------------------------------------
CREATE TABLE branches (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  slug        VARCHAR(40)  NOT NULL,
  name        VARCHAR(100) NOT NULL,
  address     VARCHAR(255) NOT NULL,
  city        VARCHAR(80)  NOT NULL,
  phone       VARCHAR(20)  NULL,
  opens_at    TIME NOT NULL,
  closes_at   TIME NOT NULL,
  description TEXT NULL,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  CONSTRAINT uq_branches_slug UNIQUE (slug),
  CONSTRAINT chk_branches_hours CHECK (opens_at < closes_at)
);

-- ---------------------------------------------------------------------
-- 3. Trainers and their specialisations (many-to-many)
-- ---------------------------------------------------------------------
CREATE TABLE trainers (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  branch_id        INT NOT NULL,
  slug             VARCHAR(60)  NOT NULL,
  name             VARCHAR(100) NOT NULL,
  title            VARCHAR(120) NOT NULL,
  bio              TEXT NULL,
  experience_years TINYINT UNSIGNED NOT NULL DEFAULT 0,
  image_url        VARCHAR(500) NULL,
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  CONSTRAINT uq_trainers_slug UNIQUE (slug),
  CONSTRAINT fk_trainers_branch FOREIGN KEY (branch_id) REFERENCES branches(id),
  CONSTRAINT chk_trainers_experience CHECK (experience_years <= 60)
);

CREATE TABLE specializations (
  id   INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(80) NOT NULL,
  CONSTRAINT uq_specializations_name UNIQUE (name)
);

CREATE TABLE trainer_specializations (
  trainer_id        INT NOT NULL,
  specialization_id INT NOT NULL,
  PRIMARY KEY (trainer_id, specialization_id),
  CONSTRAINT fk_ts_trainer FOREIGN KEY (trainer_id) REFERENCES trainers(id) ON DELETE CASCADE,
  CONSTRAINT fk_ts_specialization FOREIGN KEY (specialization_id) REFERENCES specializations(id) ON DELETE CASCADE
);

-- Weekly working hours: one row per trainer per weekday (1 = Monday ... 7 = Sunday).
CREATE TABLE trainer_availability (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  trainer_id INT NOT NULL,
  weekday    TINYINT NOT NULL,
  start_time TIME NOT NULL,
  end_time   TIME NOT NULL,
  CONSTRAINT uq_availability_day UNIQUE (trainer_id, weekday),
  CONSTRAINT fk_availability_trainer FOREIGN KEY (trainer_id) REFERENCES trainers(id) ON DELETE CASCADE,
  CONSTRAINT chk_availability_weekday CHECK (weekday BETWEEN 1 AND 7),
  CONSTRAINT chk_availability_times CHECK (start_time < end_time)
);

-- ---------------------------------------------------------------------
-- 4. Membership plans and their features (many-to-many)
-- ---------------------------------------------------------------------
CREATE TABLE membership_plans (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  slug           VARCHAR(40)  NOT NULL,
  name           VARCHAR(80)  NOT NULL,
  price          DECIMAL(10, 2) NOT NULL,
  billing_period ENUM('monthly', 'yearly') NOT NULL,
  description    VARCHAR(255) NULL,
  is_popular     BOOLEAN NOT NULL DEFAULT FALSE,
  display_order  INT NOT NULL DEFAULT 0,
  CONSTRAINT uq_plans_slug UNIQUE (slug),
  CONSTRAINT chk_plans_price CHECK (price >= 0)
);

CREATE TABLE features (
  id    INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(120) NOT NULL,
  CONSTRAINT uq_features_title UNIQUE (title)
);

CREATE TABLE plan_features (
  plan_id    INT NOT NULL,
  feature_id INT NOT NULL,
  PRIMARY KEY (plan_id, feature_id),
  CONSTRAINT fk_pf_plan FOREIGN KEY (plan_id) REFERENCES membership_plans(id) ON DELETE CASCADE,
  CONSTRAINT fk_pf_feature FOREIGN KEY (feature_id) REFERENCES features(id) ON DELETE CASCADE
);

-- ---------------------------------------------------------------------
-- 5. Appointments: THE HARD REQUIREMENT (concurrency)
--
--    Rule: a trainer can never have two CONFIRMED sessions that overlap.
--    The booking code enforces this inside a transaction that locks the
--    trainer's row (SELECT ... FOR UPDATE), see backend/routes/appointments.js.
--
--    Safety net in the database itself: `active_slot` equals starts_at while
--    the appointment is confirmed and NULL otherwise. The UNIQUE key on
--    (trainer_id, active_slot) makes two confirmed bookings of the same
--    trainer at the same start time impossible, even if the application
--    code were wrong. (UNIQUE allows many NULLs, so cancelled rows are fine.)
-- ---------------------------------------------------------------------
CREATE TABLE appointments (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  trainer_id       INT NOT NULL,
  member_id        INT NOT NULL,
  starts_at        DATETIME NOT NULL,
  ends_at          DATETIME NOT NULL,
  duration_minutes SMALLINT NOT NULL,
  status           ENUM('confirmed', 'cancelled', 'completed') NOT NULL DEFAULT 'confirmed',
  notes            VARCHAR(500) NULL,
  rescheduled_from INT NULL,
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  cancelled_at     DATETIME NULL,
  active_slot      DATETIME GENERATED ALWAYS AS (IF(status = 'confirmed', starts_at, NULL)) STORED,
  CONSTRAINT fk_appointments_trainer FOREIGN KEY (trainer_id) REFERENCES trainers(id),
  CONSTRAINT fk_appointments_member FOREIGN KEY (member_id) REFERENCES users(id),
  CONSTRAINT fk_appointments_rescheduled FOREIGN KEY (rescheduled_from) REFERENCES appointments(id),
  CONSTRAINT uq_trainer_active_slot UNIQUE (trainer_id, active_slot),
  CONSTRAINT chk_appointments_duration CHECK (duration_minutes IN (30, 60, 90)),
  CONSTRAINT chk_appointments_times CHECK (ends_at = starts_at + INTERVAL duration_minutes MINUTE)
);

-- Indexes for the queries the app runs most (see docs/PERFORMANCE.md):
--   overlap check / trainer schedule:  WHERE trainer_id = ? AND starts_at < ? ...
--   "my appointments":                 WHERE member_id = ? ORDER BY starts_at
--   admin list filtered by status:     WHERE status = ? ORDER BY starts_at
CREATE INDEX idx_appointments_trainer_time ON appointments (trainer_id, starts_at);
CREATE INDEX idx_appointments_member_time  ON appointments (member_id, starts_at);
CREATE INDEX idx_appointments_status_time  ON appointments (status, starts_at);

-- ---------------------------------------------------------------------
-- 6. Appointment history: APPEND-ONLY
--    Every status change is a new row. The two triggers below make the
--    database itself refuse any UPDATE or DELETE on this table.
-- ---------------------------------------------------------------------
CREATE TABLE appointment_history (
  id             BIGINT AUTO_INCREMENT PRIMARY KEY,
  appointment_id INT NOT NULL,
  old_status     VARCHAR(20) NULL,
  new_status     VARCHAR(20) NOT NULL,
  changed_by     INT NULL,
  note           VARCHAR(255) NULL,
  changed_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_history_appointment FOREIGN KEY (appointment_id) REFERENCES appointments(id),
  CONSTRAINT fk_history_user FOREIGN KEY (changed_by) REFERENCES users(id),
  INDEX idx_history_appointment (appointment_id, changed_at)
);

CREATE TRIGGER trg_history_no_update BEFORE UPDATE ON appointment_history
  FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'appointment_history is append-only';

CREATE TRIGGER trg_history_no_delete BEFORE DELETE ON appointment_history
  FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'appointment_history is append-only';

-- ---------------------------------------------------------------------
-- 7. Enquiries (public contact / consultation form)
-- ---------------------------------------------------------------------
CREATE TABLE enquiries (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  full_name  VARCHAR(100) NOT NULL,
  email      VARCHAR(254) NOT NULL,
  phone      VARCHAR(20)  NULL,
  goal       ENUM('Weight Loss', 'Muscle Gain', 'General Fitness', 'Strength', 'Rehabilitation', 'Other') NOT NULL,
  message    VARCHAR(2000) NOT NULL,
  status     ENUM('new', 'contacted', 'closed') NOT NULL DEFAULT 'new',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_enquiries_status (status, created_at)
);
