-- =====================================================================
-- FitLean Fitness: reference and demo data (fictional, for the demo only)
--
-- Loaded after schema.sql. Users (with bcrypt password hashes) and the
-- 5,000+ volume appointments are created by backend/scripts/setup-db.js,
-- because hashing a password has to happen in code, not in SQL.
-- =====================================================================
USE fitlean;

-- Branches -------------------------------------------------------------
INSERT INTO branches (id, slug, name, address, city, phone, opens_at, closes_at, description) VALUES
  (1, 'dwarka',   'FitLean Dwarka',   'Plot 42, Sector 12 Main Market, Dwarka', 'New Delhi', '+91 11 4000 1001', '05:00', '23:00',
   'Our flagship gym: strength floor, cardio deck and private training rooms.'),
  (2, 'saket',    'FitLean Saket',    '2nd Floor, Select Arcade, Saket',        'New Delhi', '+91 11 4000 1002', '06:00', '22:00',
   'A compact studio focused on coaching, mobility and conditioning.'),
  (3, 'gurugram', 'FitLean Gurugram', 'Tower B, Cyber Park, Sector 39',         'Gurugram',  '+91 124 400 1003', '06:00', '22:00',
   'Open-plan training floor next to Cyber City offices.');

-- Specialisations ------------------------------------------------------
INSERT INTO specializations (id, name) VALUES
  (1, 'Strength & Powerlifting'),
  (2, 'Bio-mechanics'),
  (3, 'HIIT & Conditioning'),
  (4, 'Nutrition & Fat Loss'),
  (5, 'Hypertrophy'),
  (6, 'Mobility');

-- Trainers -------------------------------------------------------------
INSERT INTO trainers (id, branch_id, slug, name, title, bio, experience_years) VALUES
  (1, 1, 'marcus-thorne',    'Marcus Thorne',     'Performance Coach · CSCS',
   'Specialises in biomechanics and functional hypertrophy, building strong, injury-resistant athletes.', 8),
  (2, 1, 'elena-rostova',    'Dr. Elena Rostova', 'Bio-Mechanist · PhD Kinesiology',
   'Expert in spinal mechanics and joint rehabilitation. Runs baseline movement assessments.', 12),
  (3, 2, 'jackson-vane',     'Jackson Vane',      'HIIT Specialist · NASM CPT',
   'High-energy conditioning coach who designs interval sessions for fat loss and endurance.', 5),
  (4, 2, 'rohit-sharma',     'Rohit Sharma',      'Head Strength Coach · CSCS',
   'Heavy barbell technique: squat, bench and deadlift bar-path coaching and meet preparation.', 8),
  (5, 3, 'priya-verma',      'Priya Verma',       'Functional & Mobility Specialist',
   'Focuses on mobility, hip-hinge patterns and getting back to training after injury.', 6),
  (6, 3, 'vikram-singh',     'Vikram Singh',      'Body Transformation Coach',
   'Data-driven body recomposition through progressive overload and nutrition phasing.', 7);

INSERT INTO trainer_specializations (trainer_id, specialization_id) VALUES
  (1, 1), (1, 5),
  (2, 2), (2, 6),
  (3, 3), (3, 4),
  (4, 1),
  (5, 6), (5, 2),
  (6, 4), (6, 5);

-- Working hours: every trainer works Monday-Saturday, 09:00-18:00 ------
INSERT INTO trainer_availability (trainer_id, weekday, start_time, end_time)
SELECT t.id, d.weekday, '09:00', '18:00'
FROM trainers t
CROSS JOIN (SELECT 1 AS weekday UNION ALL SELECT 2 UNION ALL SELECT 3
            UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6) d;

-- Membership plans and features ----------------------------------------
INSERT INTO membership_plans (id, slug, name, price, billing_period, description, is_popular, display_order) VALUES
  (1, 'base',  'Base Plan',        2999.00,  'monthly', 'Essential access for the disciplined athlete.',      FALSE, 1),
  (2, 'pro',   'Pro Tier',         4999.00,  'monthly', 'Enhanced recovery and personalised guidance.',      TRUE,  2),
  (3, 'elite', 'Elite Membership', 39999.00, 'yearly',  'All-inclusive membership with a dedicated coach.',  FALSE, 3);

INSERT INTO features (id, title) VALUES
  (1, 'Standard hours access (5 AM - 11 PM)'),
  (2, '24/7 unlimited access'),
  (3, 'Cardio and free weights'),
  (4, 'Locker room access'),
  (5, 'Recovery suite (sauna, cold plunge)'),
  (6, '1-on-1 personal training session'),
  (7, 'Guest passes'),
  (8, 'Personalised nutrition plan');

INSERT INTO plan_features (plan_id, feature_id) VALUES
  (1, 1), (1, 3), (1, 4),
  (2, 2), (2, 3), (2, 4), (2, 5), (2, 6),
  (3, 2), (3, 3), (3, 4), (3, 5), (3, 6), (3, 7), (3, 8);
