-- ══════════════════════════════════════════════════════════════════
--  Bridge Management System — Production Database Schema v2.0
--  Engine   : InnoDB | Encoding : utf8mb4_unicode_ci
--  Compatible: MySQL 5.7 / MySQL 8.x
-- ══════════════════════════════════════════════════════════════════
--
--  HOW TO USE
--  ──────────
--  MySQL CLI:
--    mysql -u root -p < schema.sql
--  MySQL Workbench:
--    File → Open SQL Script → Execute (⚡)
--
--  ⚠  BEFORE GOING LIVE — replace sample password hashes:
--
--    node -e "
--      const b = require('bcryptjs');
--      console.log('Admin   :', b.hashSync('Admin@1234', 10));
--      console.log('Engineer:', b.hashSync('Engineer@1234', 10));
--    "
--
--    UPDATE users SET password = '<hash>' WHERE email = 'admin@bms.gov';
--
--  Default test password for ALL sample users: password
-- ══════════════════════════════════════════════════════════════════

CREATE DATABASE IF NOT EXISTS bridge
  CHARACTER SET  utf8mb4
  COLLATE        utf8mb4_unicode_ci;

USE bridge;

-- ══════════════════════════════════════════════════════════════════
--  SCHEMA TABLES  (foreign-key safe creation order)
-- ══════════════════════════════════════════════════════════════════

-- ── users ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id          INT UNSIGNED                   NOT NULL AUTO_INCREMENT,
  first_name  VARCHAR(100)                   NOT NULL,
  last_name   VARCHAR(100)                   NOT NULL,
  email       VARCHAR(255)                   NOT NULL,
  password    VARCHAR(255)                   NOT NULL,
  role        ENUM('ADMIN','ENGINEER')        NOT NULL DEFAULT 'ENGINEER',
  is_active   TINYINT(1)                     NOT NULL DEFAULT 1
                COMMENT 'Soft-disable accounts without deleting history',
  created_at  TIMESTAMP                      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP                      NOT NULL DEFAULT CURRENT_TIMESTAMP
                                                       ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY  uq_users_email  (email),
  KEY         idx_users_role  (role),
  KEY         idx_users_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='System users — engineers and administrators';

-- ── bridges ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bridges (
  id                INT UNSIGNED                       NOT NULL AUTO_INCREMENT,
  serial_number     VARCHAR(100)                       NOT NULL,
  bridge_name       VARCHAR(255)                       DEFAULT NULL
                      COMMENT 'Human-readable name (e.g. Kafue River Crossing)',
  structure_type    VARCHAR(100)                       NOT NULL,
  section           VARCHAR(255)                       NOT NULL
                      COMMENT 'Road section or route identifier',
  chainage          DECIMAL(10,3)                      NOT NULL
                      COMMENT 'Distance from route origin in km (e.g. 45.500 = km 45+500)',
  northing          DECIMAL(12,6)                      DEFAULT NULL,
  easting           DECIMAL(12,6)                      DEFAULT NULL,
  altitude          DECIMAL(8,3)                       DEFAULT NULL
                      COMMENT 'Meters above sea level',
  length            DECIMAL(8,2)                       DEFAULT NULL
                      COMMENT 'Total bridge length in meters',
  width             DECIMAL(8,2)                       DEFAULT NULL
                      COMMENT 'Carriageway width in meters',
  height            DECIMAL(8,2)                       DEFAULT NULL
                      COMMENT 'Vertical clearance in meters',
  number_of_spans   SMALLINT UNSIGNED                  DEFAULT NULL,
  construction_year YEAR                               DEFAULT NULL,
  current_condition ENUM('GOOD','FAIR','POOR')          DEFAULT NULL
                      COMMENT 'Auto-maintained by trigger — reflects latest inspection',
  remark            TEXT                               DEFAULT NULL,
  created_by        INT UNSIGNED                       DEFAULT NULL,
  created_at        TIMESTAMP                          NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP                          NOT NULL DEFAULT CURRENT_TIMESTAMP
                                                                ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY  uq_bridges_serial              (serial_number),
  KEY         idx_bridges_section            (section),
  KEY         idx_bridges_chainage           (chainage),
  KEY         idx_bridges_current_condition  (current_condition),
  CONSTRAINT  fk_bridges_created_by
              FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Master bridge inventory';

-- ── inspections ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS inspections (
  id                  INT UNSIGNED                    NOT NULL AUTO_INCREMENT,
  bridge_id           INT UNSIGNED                    NOT NULL,
  user_id             INT UNSIGNED                    DEFAULT NULL
                        COMMENT 'System user who recorded the inspection',
  inspector_name      VARCHAR(200)                    NOT NULL
                        COMMENT 'Name of the engineer who performed the field inspection',
  inspection_date     DATE                            NOT NULL,
  defect_description  TEXT                            DEFAULT NULL,
  remedy              TEXT                            DEFAULT NULL,
  condition_status    ENUM('GOOD','FAIR','POOR')       NOT NULL,
  last_visit_date     DATE                            DEFAULT NULL,
  notes               TEXT                            DEFAULT NULL
                        COMMENT 'Additional field observations',
  is_resolved         TINYINT(1)                      NOT NULL DEFAULT 0,
  resolved_at         DATETIME                        DEFAULT NULL,
  resolved_by         VARCHAR(200)                    DEFAULT NULL,
  created_at          TIMESTAMP                       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP                       NOT NULL DEFAULT CURRENT_TIMESTAMP
                                                               ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_ins_bridge_date  (bridge_id, inspection_date DESC),
  KEY idx_ins_condition    (condition_status),
  KEY idx_ins_unresolved   (is_resolved, condition_status),
  KEY idx_ins_date         (inspection_date DESC),
  KEY idx_ins_user         (user_id),
  CONSTRAINT fk_ins_bridge FOREIGN KEY (bridge_id) REFERENCES bridges(id)  ON DELETE CASCADE,
  CONSTRAINT fk_ins_user   FOREIGN KEY (user_id)   REFERENCES users(id)    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Bridge inspection records — one row per field inspection';

-- ── photos ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS photos (
  id             INT UNSIGNED                    NOT NULL AUTO_INCREMENT,
  bridge_id      INT UNSIGNED                    NOT NULL,
  inspection_id  INT UNSIGNED                    DEFAULT NULL
                   COMMENT 'Optional link to the inspection this photo was taken for',
  photo_url      VARCHAR(1000)                   NOT NULL,
  photo_type     ENUM('PHOTO_1','PHOTO_2')        NOT NULL,
  public_id      VARCHAR(500)                    DEFAULT NULL
                   COMMENT 'Cloudinary public_id — NULL when using local disk storage',
  uploaded_by    INT UNSIGNED                    DEFAULT NULL,
  created_at     TIMESTAMP                       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY  uq_photos_bridge_type   (bridge_id, photo_type),
  KEY         idx_photos_inspection   (inspection_id),
  CONSTRAINT  fk_photo_bridge
              FOREIGN KEY (bridge_id)     REFERENCES bridges(id)     ON DELETE CASCADE,
  CONSTRAINT  fk_photo_inspection
              FOREIGN KEY (inspection_id) REFERENCES inspections(id) ON DELETE SET NULL,
  CONSTRAINT  fk_photo_uploader
              FOREIGN KEY (uploaded_by)   REFERENCES users(id)       ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Bridge photos — max two photos per bridge (PHOTO_1, PHOTO_2)';

-- ── maintenance_records ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS maintenance_records (
  id                INT UNSIGNED                                           NOT NULL AUTO_INCREMENT,
  bridge_id         INT UNSIGNED                                           NOT NULL,
  maintenance_type  ENUM('ROUTINE','PREVENTIVE','EMERGENCY','REHABILITATION') NOT NULL,
  description       TEXT                                                   NOT NULL,
  cost              DECIMAL(15,2)                                          DEFAULT NULL
                      COMMENT 'Cost in local currency (ZMW / USD)',
  maintenance_date  DATE                                                   NOT NULL,
  performed_by      VARCHAR(200)                                           NOT NULL,
  status            ENUM('PLANNED','IN_PROGRESS','COMPLETED','CANCELLED')  NOT NULL DEFAULT 'PLANNED',
  created_by        INT UNSIGNED                                           DEFAULT NULL,
  created_at        TIMESTAMP                                              NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_maint_bridge  (bridge_id),
  KEY idx_maint_status  (status),
  KEY idx_maint_date    (maintenance_date DESC),
  KEY idx_maint_type    (maintenance_type),
  CONSTRAINT fk_maint_bridge      FOREIGN KEY (bridge_id)  REFERENCES bridges(id) ON DELETE CASCADE,
  CONSTRAINT fk_maint_created_by  FOREIGN KEY (created_by) REFERENCES users(id)   ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Bridge maintenance and rehabilitation records';

-- ── history_logs ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS history_logs (
  id           INT UNSIGNED   NOT NULL AUTO_INCREMENT,
  bridge_id    INT UNSIGNED   NOT NULL,
  user_id      INT UNSIGNED   DEFAULT NULL,
  action_type  VARCHAR(50)    NOT NULL
                 COMMENT 'CREATE | UPDATE | INSPECTION_ADDED | INSPECTION_UPDATED | PHOTO_UPLOADED | DEFECT_RESOLVED',
  old_values   JSON           DEFAULT NULL
                 COMMENT 'Field values before the change',
  new_values   JSON           DEFAULT NULL
                 COMMENT 'Field values after the change',
  ip_address   VARCHAR(45)    DEFAULT NULL
                 COMMENT 'Request IP address — IPv4 or IPv6',
  created_at   TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_hist_bridge  (bridge_id),
  KEY idx_hist_user    (user_id),
  KEY idx_hist_action  (action_type),
  KEY idx_hist_created (created_at DESC),
  CONSTRAINT fk_hist_bridge FOREIGN KEY (bridge_id) REFERENCES bridges(id) ON DELETE CASCADE,
  CONSTRAINT fk_hist_user   FOREIGN KEY (user_id)   REFERENCES users(id)   ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Full audit trail — every create, update, and resolution event';

-- ── notifications ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id          INT UNSIGNED                              NOT NULL AUTO_INCREMENT,
  user_id     INT UNSIGNED                              NOT NULL,
  title       VARCHAR(255)                              NOT NULL,
  message     TEXT                                      NOT NULL,
  type        ENUM('INFO','WARNING','ALERT','REMINDER')  NOT NULL DEFAULT 'INFO',
  is_read     TINYINT(1)                                NOT NULL DEFAULT 0,
  created_at  TIMESTAMP                                 NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_notif_user_read  (user_id, is_read),
  KEY idx_notif_created    (created_at DESC),
  CONSTRAINT fk_notif_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='User notifications — inspection reminders and system alerts';


-- ══════════════════════════════════════════════════════════════════
--  TRIGGERS — Auto-maintain bridges.current_condition
--  Runs after any INSERT, UPDATE or DELETE on inspections.
--  Always reflects the most recent inspection's condition_status.
-- ══════════════════════════════════════════════════════════════════

DELIMITER //

DROP TRIGGER IF EXISTS trg_after_ins_insert //
CREATE TRIGGER trg_after_ins_insert
AFTER INSERT ON inspections
FOR EACH ROW
BEGIN
  UPDATE bridges
  SET    current_condition = (
           SELECT condition_status
           FROM   inspections
           WHERE  bridge_id = NEW.bridge_id
           ORDER  BY inspection_date DESC, id DESC
           LIMIT  1
         )
  WHERE  id = NEW.bridge_id;
END //

DROP TRIGGER IF EXISTS trg_after_ins_update //
CREATE TRIGGER trg_after_ins_update
AFTER UPDATE ON inspections
FOR EACH ROW
BEGIN
  UPDATE bridges
  SET    current_condition = (
           SELECT condition_status
           FROM   inspections
           WHERE  bridge_id = NEW.bridge_id
           ORDER  BY inspection_date DESC, id DESC
           LIMIT  1
         )
  WHERE  id = NEW.bridge_id;
END //

DROP TRIGGER IF EXISTS trg_after_ins_delete //
CREATE TRIGGER trg_after_ins_delete
AFTER DELETE ON inspections
FOR EACH ROW
BEGIN
  UPDATE bridges
  SET    current_condition = (
           SELECT condition_status
           FROM   inspections
           WHERE  bridge_id = OLD.bridge_id
           ORDER  BY inspection_date DESC, id DESC
           LIMIT  1
         )
  WHERE  id = OLD.bridge_id;
END //

DELIMITER ;


-- ══════════════════════════════════════════════════════════════════
--  SAMPLE DATA
--  ⚠  Default password for ALL sample users: password
--     Hash: $2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi
--     (bcrypt compatible with Node.js bcryptjs — accepts $2y$ prefix)
--     CHANGE ALL PASSWORDS before production deployment.
-- ══════════════════════════════════════════════════════════════════

-- ── Users ─────────────────────────────────────────────────────────
INSERT INTO users (first_name, last_name, email, password, role, is_active) VALUES
  ('System', 'Administrator',
   'admin@bms.gov',
   '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
   'ADMIN', 1),

  ('John', 'Banda',
   'j.banda@bms.gov',
   '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
   'ENGINEER', 1),

  ('Mary', 'Phiri',
   'm.phiri@bms.gov',
   '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
   'ENGINEER', 1);

-- ── Bridges ────────────────────────────────────────────────────────
--  Note: IDs 1–6 depend on auto_increment starting from 1 (fresh install)
INSERT INTO bridges
  (serial_number, bridge_name, structure_type, section,
   chainage, northing, easting, altitude,
   length, width, height, number_of_spans,
   construction_year, remark, created_by)
VALUES
  ('BRG-001', 'Kafue River Crossing',
   'Concrete Beam Bridge', 'T2 Great North Road',
   45.500, -15.416389, 28.282778, 1025.50,
   85.00, 9.50, 7.20, 5,
   1998, 'Major river crossing on T2 highway — periodic scour monitoring required', 1),

  ('BRG-002', 'Chamboli Stream Culvert',
   'Box Culvert', 'M5 Ndola-Mufulira Road',
   12.800, -12.969444, 28.635556, 1280.30,
   12.00, 8.00, 3.50, 1,
   2005, 'Concrete box culvert — susceptible to siltation during heavy rainfall', 1),

  ('BRG-003', 'Luangwa Valley Bridge',
   'Steel Truss Bridge', 'T4 Eastern Highway',
   183.200, -13.991389, 31.565556, 510.80,
   210.00, 8.00, 12.00, 7,
   1975, 'Ageing steel truss — structural monitoring program in place', 1),

  ('BRG-004', 'Chipata Bypass Overpass',
   'Reinforced Concrete Slab Bridge', 'M12 Chipata Ring Road',
   8.150, -13.638889, 32.648056, 1020.00,
   24.00, 11.00, 5.80, 2,
   2012, 'Urban overpass, post-construction 3-year warranty period concluded', 2),

  ('BRG-005', 'Mumbwa Road Culvert',
   'Corrugated Steel Pipe Culvert', 'D104 Mumbwa-Landless Road',
   34.750, -14.982500, 27.050000, 1105.20,
   8.50, 6.00, 2.10, 1,
   2001, 'Recurrent siltation — scheduled for upsizing in next capital program', 2),

  ('BRG-006', 'Livingstone Falls Bridge',
   'Pre-stressed Concrete Bridge', 'T1 Livingstone Highway',
   452.300, -17.851389, 25.854167, 950.00,
   140.00, 10.50, 15.50, 6,
   2003, 'High traffic tourist corridor — annual inspection regime', 1);

-- ── Inspections ────────────────────────────────────────────────────
--  Triggers will auto-update bridges.current_condition after each INSERT.
INSERT INTO inspections
  (bridge_id, user_id, inspector_name, inspection_date,
   defect_description, remedy, condition_status, last_visit_date, notes)
VALUES
  -- BRG-001: GOOD (2025-11-15)
  (1, 2, 'John Banda', '2025-11-15',
   NULL, NULL,
   'GOOD', '2025-05-10',
   'All expansion joints intact. No visible cracking or spalling. Drainage outlets clear.'),

  -- BRG-002: FAIR (2025-10-22) — siltation
  (2, 2, 'John Banda', '2025-10-22',
   'Partial siltation at barrel inlet reducing estimated flow capacity by 30%. Minor concrete spalling on left wing wall (0.2 m²).',
   'Schedule inlet desiltation prior to wet season. Patch spalled wing wall with polymer-modified mortar.',
   'FAIR', '2024-09-15',
   'Flow restriction observed during site visit. Monitor through November–March wet season.'),

  -- BRG-003: FAIR earlier inspection — resolved
  (3, 3, 'Mary Phiri', '2024-06-20',
   'Early-stage corrosion on lower chord members L3–L4. Deck surface showing longitudinal hairline cracks.',
   'Apply anti-corrosion coating to affected truss members. Fill deck cracks with low-viscosity epoxy grout.',
   'FAIR', '2023-11-05',
   'Flagged for accelerated monitoring. Next inspection within 6 months.'),

  -- BRG-003: POOR (2025-09-08) — current, unresolved
  (3, 3, 'Mary Phiri', '2025-09-08',
   'Severe corrosion on main truss members L3–L4 and L5–L6: cross-sectional loss estimated 35–40%. Bearing plates displaced at Pier 4. Deck cracking 12–18 mm width over 40% of deck area.',
   'IMMEDIATE: impose 10-tonne load restriction. Commission independent structural assessment. Prepare tender for truss rehabilitation or replacement.',
   'POOR', '2024-06-20',
   'URGENT: Load restriction signs and barriers installed same day. Full rehabilitation tender to be issued within 30 days.'),

  -- BRG-004: GOOD (2025-12-02)
  (4, 2, 'John Banda', '2025-12-02',
   NULL, NULL,
   'GOOD', '2025-06-15',
   'Post-construction 3-year inspection. Structure performing as designed. No defects noted.'),

  -- BRG-005: FAIR (2025-08-14)
  (5, 3, 'Mary Phiri', '2025-08-14',
   'Heavy siltation throughout pipe length — approximately 60% blockage. Headwall erosion visible around wingwall aprons.',
   'Full pipe cleaning by high-pressure water jetting. Repair eroded wingwall aprons with stone pitching and concrete haunching.',
   'FAIR', NULL,
   'Access track to headwall requires grading before maintenance crew can operate jetting equipment.'),

  -- BRG-006: GOOD (2026-01-10)
  (6, 2, 'John Banda', '2026-01-10',
   NULL, NULL,
   'GOOD', '2025-07-22',
   'Annual inspection complete. All bearings functioning correctly. Expansion joints clear of debris. No spalling or cracking observed.');

-- Resolve the BRG-003 first (2024) inspection
UPDATE inspections
SET    is_resolved = 1,
       resolved_at = '2024-09-10 14:00:00',
       resolved_by = 'John Banda'
WHERE  bridge_id = 3
  AND  inspection_date = '2024-06-20';

-- ── Maintenance Records ─────────────────────────────────────────────
INSERT INTO maintenance_records
  (bridge_id, maintenance_type, description, cost, maintenance_date, performed_by, status, created_by)
VALUES
  (2, 'ROUTINE',
   'Inlet desiltation by hydraulic excavator. Debris removal from barrel. Polymer-mortar patch on left wing wall.',
   2850.00, '2025-11-30',
   'Roads Department District Maintenance Unit', 'COMPLETED', 1),

  (3, 'EMERGENCY',
   'Installation of 10-tonne load restriction signs and concrete barriers at both approaches. Temporary steel plates epoxy-bonded over critical deck cracks.',
   5200.00, '2025-09-15',
   'Emergency Works Unit — Road Development Agency', 'COMPLETED', 1),

  (3, 'REHABILITATION',
   'Full truss structural assessment and rehabilitation. Replacement of corroded chord panels L3–L6. Deck resurfacing.',
   485000.00, '2026-03-01',
   'Strutek Engineering (Pty) Ltd', 'PLANNED', 1),

  (5, 'ROUTINE',
   'High-pressure water jetting to clear pipe siltation. Stone pitching and concrete haunching to wingwall aprons.',
   3100.00, '2025-10-15',
   'District Roads Engineer — Mumbwa', 'IN_PROGRESS', 1);

-- ── History Logs ───────────────────────────────────────────────────
INSERT INTO history_logs (bridge_id, user_id, action_type, old_values, new_values) VALUES
  (1, 1, 'CREATE',           '{}', '{"serialNumber":"BRG-001"}'),
  (2, 1, 'CREATE',           '{}', '{"serialNumber":"BRG-002"}'),
  (3, 1, 'CREATE',           '{}', '{"serialNumber":"BRG-003"}'),
  (4, 1, 'CREATE',           '{}', '{"serialNumber":"BRG-004"}'),
  (5, 1, 'CREATE',           '{}', '{"serialNumber":"BRG-005"}'),
  (6, 1, 'CREATE',           '{}', '{"serialNumber":"BRG-006"}'),
  (1, 2, 'INSPECTION_ADDED', '{}', '{"conditionStatus":"GOOD","inspectionDate":"2025-11-15"}'),
  (2, 2, 'INSPECTION_ADDED', '{}', '{"conditionStatus":"FAIR","inspectionDate":"2025-10-22"}'),
  (3, 3, 'INSPECTION_ADDED', '{}', '{"conditionStatus":"FAIR","inspectionDate":"2024-06-20"}'),
  (3, 3, 'INSPECTION_ADDED', '{}', '{"conditionStatus":"POOR","inspectionDate":"2025-09-08"}'),
  (3, 2, 'DEFECT_RESOLVED',
         '{"isResolved":false}',
         '{"isResolved":true,"resolvedBy":"John Banda"}'),
  (4, 2, 'INSPECTION_ADDED', '{}', '{"conditionStatus":"GOOD","inspectionDate":"2025-12-02"}'),
  (5, 3, 'INSPECTION_ADDED', '{}', '{"conditionStatus":"FAIR","inspectionDate":"2025-08-14"}'),
  (6, 2, 'INSPECTION_ADDED', '{}', '{"conditionStatus":"GOOD","inspectionDate":"2026-01-10"}');

-- ── Notifications ──────────────────────────────────────────────────
INSERT INTO notifications (user_id, title, message, type, is_read) VALUES
  (2, 'Inspection Required — BRG-003',
   'Luangwa Valley Bridge (BRG-003) was last inspected on 2024-06-20 and is rated POOR. Urgent reinspection required.',
   'ALERT', 0),
  (3, 'Routine Inspection Overdue — BRG-005',
   'Mumbwa Road Culvert (BRG-005) maintenance is currently IN PROGRESS. Please update status after site visit.',
   'REMINDER', 0),
  (1, 'Rehabilitation Tender Ready',
   'BRG-003 rehabilitation planned for 2026-03-01. Confirm contractor engagement with Strutek Engineering.',
   'INFO', 0);


-- ══════════════════════════════════════════════════════════════════
--  MIGRATION GUIDE (upgrading from schema v1.0)
--  Run ONLY if you have an existing v1.0 database.
--  Skip this section for a fresh installation.
-- ══════════════════════════════════════════════════════════════════

/*
-- Add new columns to existing tables
ALTER TABLE users
  ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1 AFTER role;

ALTER TABLE bridges
  ADD COLUMN bridge_name       VARCHAR(255) DEFAULT NULL AFTER serial_number,
  ADD COLUMN construction_year YEAR         DEFAULT NULL AFTER number_of_spans,
  ADD COLUMN current_condition ENUM('GOOD','FAIR','POOR') DEFAULT NULL AFTER construction_year,
  ADD COLUMN created_by        INT UNSIGNED DEFAULT NULL AFTER remark,
  ADD CONSTRAINT fk_bridges_created_by
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  ADD KEY idx_bridges_current_condition (current_condition);

ALTER TABLE inspections
  ADD COLUMN notes TEXT DEFAULT NULL AFTER last_visit_date;

ALTER TABLE photos
  ADD COLUMN inspection_id INT UNSIGNED DEFAULT NULL AFTER bridge_id,
  ADD COLUMN uploaded_by   INT UNSIGNED DEFAULT NULL AFTER public_id,
  ADD CONSTRAINT fk_photo_inspection
      FOREIGN KEY (inspection_id) REFERENCES inspections(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_photo_uploader
      FOREIGN KEY (uploaded_by)   REFERENCES users(id)       ON DELETE SET NULL;

-- Rename history_logs columns
ALTER TABLE history_logs
  CHANGE COLUMN action        action_type VARCHAR(50)  NOT NULL,
  CHANGE COLUMN changed_fields old_values  JSON         DEFAULT NULL,
  ADD COLUMN    new_values     JSON        DEFAULT NULL AFTER old_values,
  ADD COLUMN    ip_address     VARCHAR(45) DEFAULT NULL AFTER new_values,
  ADD KEY idx_hist_action (action_type);

-- Migrate changed_fields data to old_values/new_values
-- (conservative migration — stores original JSON as new_values)
UPDATE history_logs
SET   new_values = old_values,
      old_values = '{}'
WHERE old_values IS NOT NULL;
*/


-- ══════════════════════════════════════════════════════════════════
--  VERIFICATION QUERIES
--  Run after import to confirm data loaded correctly.
-- ══════════════════════════════════════════════════════════════════

-- Table row counts
SELECT
  t.table_name                              AS `Table`,
  t.table_rows                              AS `Rows (approx)`,
  ROUND(t.data_length  / 1024, 1)           AS `Data  KB`,
  ROUND(t.index_length / 1024, 1)           AS `Index KB`
FROM information_schema.tables t
WHERE t.table_schema = 'bridge'
ORDER BY t.table_name;

-- Bridge condition summary (trigger auto-populated)
SELECT
  b.serial_number,
  b.bridge_name,
  b.section,
  b.current_condition,
  COUNT(i.id)            AS total_inspections,
  MAX(i.inspection_date) AS last_inspected
FROM   bridges b
LEFT   JOIN inspections i ON i.bridge_id = b.id
GROUP  BY b.id, b.serial_number, b.bridge_name, b.section, b.current_condition
ORDER  BY b.chainage;
