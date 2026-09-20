-- ══════════════════════════════════════════════════════════════════
--  MIGRATION 002 — Approval accountability + pagination indexes
--
--  1. Records WHICH operator account approved a defect, separately from the
--     free-text `resolved_by` name. Needed to enforce and audit the
--     segregation-of-duties rule (an inspector cannot sign off their own
--     defect) — a typed name cannot be checked against anything.
--
--  2. Adds the indexes that server-side pagination and sorting rely on.
--     Without them, ORDER BY + LIMIT/OFFSET on a large bridges table sorts
--     the whole result set on every page request.
--
--  SAFE TO RE-RUN: each statement is guarded. Additive only — no column is
--  dropped, no row is modified.
--
--  Apply with:
--      mysql -u <user> -p <database> < 002_approval_audit_and_indexes.sql
-- ══════════════════════════════════════════════════════════════════

-- ── 1. approved_by_user_id ────────────────────────────────────────
--  MySQL 8 has no ADD COLUMN IF NOT EXISTS, so guard through
--  information_schema and build the statement conditionally.
SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name   = 'inspections'
    AND column_name  = 'approved_by_user_id'
);

SET @sql := IF(@col_exists = 0,
  'ALTER TABLE inspections
     ADD COLUMN approved_by_user_id INT UNSIGNED DEFAULT NULL
       COMMENT ''Operator account that signed off the defect — audited, unlike the free-text resolved_by''
       AFTER resolved_by',
  'SELECT ''skip: inspections.approved_by_user_id already present'' AS note');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Foreign key: ON DELETE SET NULL keeps the sign-off record when an operator
-- account is later removed — the audit fact survives the account.
SET @fk_exists := (
  SELECT COUNT(*) FROM information_schema.table_constraints
  WHERE table_schema   = DATABASE()
    AND table_name     = 'inspections'
    AND constraint_name = 'fk_ins_approved_by'
);

SET @sql := IF(@fk_exists = 0,
  'ALTER TABLE inspections
     ADD CONSTRAINT fk_ins_approved_by FOREIGN KEY (approved_by_user_id)
     REFERENCES users(id) ON DELETE SET NULL',
  'SELECT ''skip: fk_ins_approved_by already present'' AS note');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ── 2. Pagination / sort indexes ──────────────────────────────────
--  Each ORDER BY the bridges list offers gets an index, so LIMIT/OFFSET can
--  walk it instead of sorting the full table per page.

SET @idx_exists := (
  SELECT COUNT(*) FROM information_schema.statistics
  WHERE table_schema = DATABASE() AND table_name = 'bridges' AND index_name = 'idx_bridges_created'
);
SET @sql := IF(@idx_exists = 0,
  'ALTER TABLE bridges ADD KEY idx_bridges_created (created_at DESC)',
  'SELECT ''skip: idx_bridges_created already present'' AS note');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Condition filter + newest-first ordering in one composite: the exact shape
-- of "show me POOR structures, newest first, page 2".
SET @idx_exists := (
  SELECT COUNT(*) FROM information_schema.statistics
  WHERE table_schema = DATABASE() AND table_name = 'bridges' AND index_name = 'idx_bridges_cond_created'
);
SET @sql := IF(@idx_exists = 0,
  'ALTER TABLE bridges ADD KEY idx_bridges_cond_created (current_condition, created_at DESC)',
  'SELECT ''skip: idx_bridges_cond_created already present'' AS note');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ── 3. Backfill current_condition ─────────────────────────────────
--  The triggers maintain this column going forward, but rows written before
--  the triggers existed (or by direct SQL) may be stale. The API now FILTERS
--  on it, so it must be correct before migration 002 is considered done.
UPDATE bridges b
SET    b.current_condition = (
         SELECT i.condition_status
         FROM   inspections i
         WHERE  i.bridge_id = b.id
         ORDER  BY i.inspection_date DESC, i.id DESC
         LIMIT  1
       );

-- ── Verification ──────────────────────────────────────────────────
-- SHOW COLUMNS FROM inspections LIKE 'approved_by_user_id';
-- SHOW INDEX FROM bridges WHERE Key_name LIKE 'idx_bridges_c%';
-- SELECT current_condition, COUNT(*) FROM bridges GROUP BY current_condition;
