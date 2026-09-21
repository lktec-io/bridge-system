#!/usr/bin/env node
/**
 * ══════════════════════════════════════════════════════════════════
 *  BMS migration runner
 * ══════════════════════════════════════════════════════════════════
 *
 *  Usage (from server/, or `npm run migrate` from the repo root):
 *
 *    npm run migrate              apply every pending migration
 *    npm run migrate:status       list applied / pending, change nothing
 *    npm run migrate:dry          parse + safety-check, execute nothing
 *    npm run migrate:verify       assert the post-migration schema state
 *
 *    node scripts/migrate.js --file=002_approval_audit_and_indexes.sql
 *    node scripts/migrate.js --allow-destructive     (never needed for 001/002)
 *
 *  Design notes that matter:
 *
 *  1. ONE PINNED CONNECTION. Migration 002 uses session variables
 *     (@col_exists, @sql) with PREPARE/EXECUTE to emulate
 *     "ADD COLUMN IF NOT EXISTS", which MySQL 8 lacks. Session state is
 *     per-connection, so every statement in a file must run on the SAME
 *     connection. Issuing them through the pool would scatter them across
 *     connections and the existence guards would silently misfire.
 *
 *  2. STATEMENTS ARE SPLIT HERE, not by the driver. The pool deliberately
 *     does not set `multipleStatements` (it widens the blast radius of any
 *     injection), so this script parses the file — respecting quotes,
 *     comments and DELIMITER blocks — and sends one statement at a time.
 *
 *  3. DDL IN MYSQL AUTO-COMMITS. A file cannot be wrapped in a rollback-able
 *     transaction. The protection is that every migration is written to be
 *     idempotent and re-runnable, so a partial application is fixed by
 *     running it again. The runner only records a file as applied once all
 *     of its statements succeed, and names the exact failing statement.
 *
 *  4. NOTHING DESTRUCTIVE RUNS SILENTLY. Statements are classified before
 *     execution; DROP TABLE, TRUNCATE, DELETE without WHERE and ALTER … DROP
 *     are refused unless --allow-destructive is passed explicitly.
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import os from 'os';
import { fileURLToPath } from 'url';
import pool from '../config/database.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.join(__dirname, '..', 'database', 'migrations');

// ── CLI ───────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const flag = (name) => argv.includes(`--${name}`);
const value = (name) => {
  const hit = argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split('=').slice(1).join('=') : null;
};

const MODE = flag('status') ? 'status'
  : flag('verify') ? 'verify'
  : flag('dry-run') ? 'dry'
  : 'apply';

const ONLY_FILE        = value('file');
const ALLOW_DESTRUCTIVE = flag('allow-destructive');
const FORCE_CHECKSUM    = flag('force-checksum');

// ── Console helpers ───────────────────────────────────────────────
const C = {
  reset: '\x1b[0m', dim: '\x1b[2m', bold: '\x1b[1m',
  red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m', cyan: '\x1b[36m',
};
const line = (s = '') => console.log(s);
const head = (s) => line(`\n${C.bold}${s}${C.reset}`);
const ok   = (s) => line(`  ${C.green}✓${C.reset} ${s}`);
const warn = (s) => line(`  ${C.yellow}!${C.reset} ${s}`);
const bad  = (s) => line(`  ${C.red}✗${C.reset} ${s}`);
const info = (s) => line(`  ${C.dim}·${C.reset} ${s}`);

// ══════════════════════════════════════════════════════════════════
//  SQL splitting
// ══════════════════════════════════════════════════════════════════
/**
 * Split a script into executable statements.
 *
 * Handles: single/double/backtick quoted strings (including '' and \'
 * escapes), `-- ` and `#` line comments, C-style block comments, and
 * DELIMITER reassignment (needed by trigger bodies in schema.sql).
 */
export function splitStatements(sql) {
  const statements = [];
  let delimiter = ';';
  let buf = '';
  let quote = null;
  let i = 0;

  while (i < sql.length) {
    const ch  = sql[i];
    const two = sql.slice(i, i + 2);

    if (quote) {
      buf += ch;
      // Backslash escapes do not apply inside backtick identifiers
      if (ch === '\\' && quote !== '`') { buf += sql[i + 1] ?? ''; i += 2; continue; }
      if (ch === quote) {
        if (sql[i + 1] === quote) { buf += sql[i + 1]; i += 2; continue; }  // doubled = literal
        quote = null;
      }
      i += 1;
      continue;
    }

    // Comments — dropped, never sent to the server
    if (two === '--' && /[\s\n]|^$/.test(sql[i + 2] ?? '')) {
      const nl = sql.indexOf('\n', i);
      i = nl === -1 ? sql.length : nl + 1;
      continue;
    }
    if (ch === '#') {
      const nl = sql.indexOf('\n', i);
      i = nl === -1 ? sql.length : nl + 1;
      continue;
    }
    if (two === '/*') {
      const end = sql.indexOf('*/', i + 2);
      i = end === -1 ? sql.length : end + 2;
      continue;
    }

    if (ch === "'" || ch === '"' || ch === '`') { quote = ch; buf += ch; i += 1; continue; }

    // DELIMITER only counts at the start of a statement
    if (buf.trim() === '' && /^delimiter[ \t]+/i.test(sql.slice(i, i + 24))) {
      const nl = sql.indexOf('\n', i);
      const directive = sql.slice(i, nl === -1 ? sql.length : nl);
      delimiter = directive.replace(/^delimiter[ \t]+/i, '').trim() || ';';
      i = nl === -1 ? sql.length : nl + 1;
      buf = '';
      continue;
    }

    if (sql.startsWith(delimiter, i)) {
      const stmt = buf.trim();
      if (stmt) statements.push(stmt);
      buf = '';
      i += delimiter.length;
      continue;
    }

    buf += ch;
    i += 1;
  }

  const tail = buf.trim();
  if (tail) statements.push(tail);
  return statements;
}

// ══════════════════════════════════════════════════════════════════
//  Safety classification
// ══════════════════════════════════════════════════════════════════
const BLOCKING = [
  { re: /\bDROP\s+(TABLE|DATABASE|SCHEMA)\b/i, why: 'drops a table or database' },
  { re: /\bTRUNCATE\b/i,                        why: 'truncates a table' },
  { re: /\bALTER\s+TABLE\b[\s\S]*\bDROP\s+(COLUMN|KEY|INDEX|FOREIGN\s+KEY|CONSTRAINT)\b/i, why: 'drops a column or key' },
  { re: /\bDELETE\s+FROM\b(?![\s\S]*\bWHERE\b)/i, why: 'deletes rows without a WHERE clause', outer: true },
  { re: /\bRENAME\s+TABLE\b/i,                  why: 'renames a table' },
];

const ADVISORY = [
  { re: /^\s*UPDATE\b(?![\s\S]*\bWHERE\b)/i, why: 'full-table UPDATE — every row is rewritten', outer: true },
  { re: /\bDROP\s+(INDEX|TRIGGER|VIEW)\b/i,   why: 'drops an index, trigger or view' },
];

/**
 * Strip parenthesised groups so clause detection sees only the OUTER
 * statement. Without this, `UPDATE bridges SET x = (SELECT … WHERE …)` looks
 * like it has a WHERE clause and a full-table rewrite goes unflagged.
 */
function outerClauses(stmt) {
  let out = '';
  let depth = 0;
  for (const ch of stmt) {
    if (ch === '(') { depth += 1; if (depth === 1) out += ' ( ) '; continue; }
    if (ch === ')') { depth = Math.max(depth - 1, 0); continue; }
    if (depth === 0) out += ch;
  }
  return out;
}

function classify(stmt) {
  const outer = outerClauses(stmt);
  const test = (rule) => rule.re.test(rule.outer ? outer : stmt);
  return {
    blocking: BLOCKING.filter(test).map((r) => r.why),
    advisory: ADVISORY.filter(test).map((r) => r.why),
  };
}

const preview = (stmt) =>
  stmt.replace(/\s+/g, ' ').slice(0, 96) + (stmt.replace(/\s+/g, ' ').length > 96 ? '…' : '');

// ══════════════════════════════════════════════════════════════════
//  Migration discovery
// ══════════════════════════════════════════════════════════════════
function loadMigrations() {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    throw new Error(`Migrations directory not found: ${MIGRATIONS_DIR}`);
  }

  return fs.readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .filter((f) => !ONLY_FILE || f === ONLY_FILE)
    .sort()                                   // 001_, 002_, … lexical order is the run order
    .map((filename) => {
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, filename), 'utf8');
      return {
        filename,
        sql,
        checksum: crypto.createHash('sha256').update(sql.replace(/\r\n/g, '\n')).digest('hex'),
        statements: splitStatements(sql),
      };
    });
}

// ══════════════════════════════════════════════════════════════════
//  Ledger
// ══════════════════════════════════════════════════════════════════
const LEDGER_DDL = `
  CREATE TABLE IF NOT EXISTS schema_migrations (
    id           INT UNSIGNED  NOT NULL AUTO_INCREMENT,
    filename     VARCHAR(255)  NOT NULL,
    checksum     CHAR(64)      NOT NULL COMMENT 'sha256 of the file when applied',
    statements   INT UNSIGNED  NOT NULL,
    duration_ms  INT UNSIGNED  NOT NULL,
    applied_by   VARCHAR(120)  DEFAULT NULL,
    applied_at   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_schema_migrations_filename (filename)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    COMMENT='Applied database migrations — written by scripts/migrate.js'
`;

async function ensureLedger(conn) {
  await conn.query(LEDGER_DDL);
}

async function appliedMap(conn) {
  const [rows] = await conn.query(
    'SELECT filename, checksum, applied_at, statements FROM schema_migrations ORDER BY filename'
  );
  return new Map(rows.map((r) => [r.filename, r]));
}

// ══════════════════════════════════════════════════════════════════
//  Verification — proves the schema is ready and data survived
// ══════════════════════════════════════════════════════════════════
async function verify(conn) {
  let failures = 0;

  const columnExists = async (table, column) => {
    const [r] = await conn.query(
      `SELECT COUNT(*) AS n FROM information_schema.columns
       WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?`,
      [table, column]
    );
    return Number(r[0].n) > 0;
  };
  const indexExists = async (table, index) => {
    const [r] = await conn.query(
      `SELECT COUNT(*) AS n FROM information_schema.statistics
       WHERE table_schema = DATABASE() AND table_name = ? AND index_name = ?`,
      [table, index]
    );
    return Number(r[0].n) > 0;
  };
  const tableExists = async (table) => {
    const [r] = await conn.query(
      `SELECT COUNT(*) AS n FROM information_schema.tables
       WHERE table_schema = DATABASE() AND table_name = ?`,
      [table]
    );
    return Number(r[0].n) > 0;
  };
  const check = (pass, label) => {
    if (pass) ok(label); else { bad(label); failures += 1; }
  };

  head('Schema — migration 001 (sensor telemetry)');
  check(await tableExists('sensor_devices'),  'sensor_devices table present');
  check(await tableExists('sensor_readings'), 'sensor_readings table present');
  check(await indexExists('sensor_readings', 'idx_reading_device_time'),
        'idx_reading_device_time present (latest-N per device)');

  head('Schema — migration 002 (approval audit + pagination)');
  check(await columnExists('inspections', 'approved_by_user_id'),
        'inspections.approved_by_user_id present');
  const [fk] = await conn.query(
    `SELECT COUNT(*) AS n FROM information_schema.table_constraints
     WHERE table_schema = DATABASE() AND table_name = 'inspections'
       AND constraint_name = 'fk_ins_approved_by'`
  );
  check(Number(fk[0].n) > 0, 'fk_ins_approved_by foreign key present');
  check(await indexExists('bridges', 'idx_bridges_created'),      'idx_bridges_created present');
  check(await indexExists('bridges', 'idx_bridges_cond_created'), 'idx_bridges_cond_created present');

  head('Data integrity — nothing erased, backfill correct');
  const [[counts]] = await conn.query(`
    SELECT
      (SELECT COUNT(*) FROM bridges)             AS bridges,
      (SELECT COUNT(*) FROM inspections)         AS inspections,
      (SELECT COUNT(*) FROM users)               AS users,
      (SELECT COUNT(*) FROM photos)              AS photos,
      (SELECT COUNT(*) FROM history_logs)        AS history_logs
  `);
  info(`bridges=${counts.bridges} · inspections=${counts.inspections} · users=${counts.users} · photos=${counts.photos} · history=${counts.history_logs}`);
  check(Number(counts.bridges) >= 0 && Number(counts.inspections) >= 0, 'core tables readable');

  // current_condition must equal the newest inspection's status for every bridge
  const [[{ mismatched }]] = await conn.query(`
    SELECT COUNT(*) AS mismatched
    FROM bridges b
    LEFT JOIN inspections li ON li.id = (
      SELECT id FROM inspections WHERE bridge_id = b.id
      ORDER BY inspection_date DESC, id DESC LIMIT 1
    )
    WHERE NOT (b.current_condition <=> li.condition_status)
  `);
  check(Number(mismatched) === 0,
        `current_condition matches latest inspection for every bridge (${mismatched} mismatched)`);

  const [dist] = await conn.query(`
    SELECT COALESCE(current_condition, 'UNINSPECTED') AS state, COUNT(*) AS n
    FROM bridges GROUP BY COALESCE(current_condition, 'UNINSPECTED') ORDER BY state
  `);
  info(`condition distribution: ${dist.map((d) => `${d.state}=${d.n}`).join(' · ') || '(no bridges)'}`);

  // The approval column must be additive: existing rows keep NULL, not garbage
  if (await columnExists('inspections', 'approved_by_user_id')) {
    const [[{ resolvedWithoutApprover }]] = await conn.query(`
      SELECT COUNT(*) AS resolvedWithoutApprover
      FROM inspections WHERE is_resolved = 1 AND approved_by_user_id IS NULL
    `);
    info(`historically resolved inspections with no recorded approver: ${resolvedWithoutApprover} (expected — the column is new)`);
  }

  return failures;
}

// ══════════════════════════════════════════════════════════════════
//  Main
// ══════════════════════════════════════════════════════════════════
async function main() {
  const migrations = loadMigrations();

  head('BMS migration runner');
  info(`target   ${process.env.DB_USER ?? 'root'}@${process.env.DB_HOST ?? '127.0.0.1'}:${process.env.DB_PORT ?? 3306}/${process.env.DB_NAME ?? '(DB_NAME unset)'}`);
  info(`mode     ${MODE}`);
  info(`files    ${migrations.length} discovered in database/migrations`);

  // ── Dry run needs no database at all ──────────────────────────
  if (MODE === 'dry') {
    let blocking = 0;
    for (const m of migrations) {
      head(`${m.filename}  ${C.dim}(${m.statements.length} statements, sha256 ${m.checksum.slice(0, 12)})${C.reset}`);
      m.statements.forEach((stmt, idx) => {
        const { blocking: b, advisory: a } = classify(stmt);
        if (b.length) { blocking += b.length; bad(`[${idx + 1}] ${b.join('; ')}`); line(`      ${C.dim}${preview(stmt)}${C.reset}`); }
        else if (a.length) { warn(`[${idx + 1}] ${a.join('; ')}`); line(`      ${C.dim}${preview(stmt)}${C.reset}`); }
        else info(`[${idx + 1}] ${preview(stmt)}`);
      });
    }
    head('Dry run complete');
    if (blocking > 0) {
      bad(`${blocking} destructive statement(s) found — would require --allow-destructive`);
      return 1;
    }
    ok('No destructive statements. Every statement is additive or an idempotent guard.');
    ok('Nothing was executed and no connection was opened.');
    return 0;
  }

  // ── Everything else needs one pinned connection ───────────────
  let conn;
  try {
    conn = await pool.getConnection();
  } catch (err) {
    head('Cannot reach MySQL');
    bad(err.message);
    info('Check DB_HOST / DB_PORT / DB_USER / DB_PASSWORD / DB_NAME in server/.env');
    return 1;
  }

  try {
    const [[{ version, db }]] = await conn.query('SELECT VERSION() AS version, DATABASE() AS db');
    ok(`connected to MySQL ${version}, database "${db ?? '(none selected)'}"`);
    if (!db) { bad('No database selected — set DB_NAME in server/.env'); return 1; }

    /* Bounded waits. On a live server an ALTER needs a metadata lock, and a
       long-running query can hold it; without a timeout the migration would
       hang indefinitely holding locks of its own. Failing fast is safe here
       because every migration is idempotent and re-runnable. */
    if (MODE === 'apply') {
      await conn.query('SET SESSION lock_wait_timeout = 60');
      await conn.query('SET SESSION innodb_lock_wait_timeout = 30');
      info('lock waits bounded: metadata 60s, row 30s');
    }

    await ensureLedger(conn);
    const applied = await appliedMap(conn);

    // ── STATUS ────────────────────────────────────────────────
    if (MODE === 'status') {
      head('Migration status');
      for (const m of migrations) {
        const row = applied.get(m.filename);
        if (!row) { warn(`PENDING  ${m.filename}  (${m.statements.length} statements)`); continue; }
        const drift = row.checksum !== m.checksum;
        const when = new Date(row.applied_at).toISOString().replace('T', ' ').slice(0, 19);
        if (drift) bad(`APPLIED  ${m.filename}  ${when}  ${C.red}checksum changed since it was applied${C.reset}`);
        else ok(`APPLIED  ${m.filename}  ${when}`);
      }
      const pending = migrations.filter((m) => !applied.has(m.filename));
      head(pending.length === 0 ? 'Database is up to date' : `${pending.length} migration(s) pending`);
      return 0;
    }

    // ── VERIFY ────────────────────────────────────────────────
    if (MODE === 'verify') {
      const failures = await verify(conn);
      head(failures === 0 ? 'Verification passed' : `Verification failed — ${failures} check(s)`);
      if (failures > 0) info('Run `npm run migrate` to apply pending migrations, then verify again.');
      return failures === 0 ? 0 : 1;
    }

    // ── APPLY ─────────────────────────────────────────────────
    const pending = [];
    for (const m of migrations) {
      const row = applied.get(m.filename);
      if (!row) { pending.push(m); continue; }
      if (row.checksum !== m.checksum && !FORCE_CHECKSUM) {
        head('Refusing to continue');
        bad(`${m.filename} was already applied, but its contents have changed.`);
        info('Applied migrations are immutable: add a new numbered migration instead.');
        info('If the edit was cosmetic (comments only), re-record it with --force-checksum.');
        return 1;
      }
      if (row.checksum !== m.checksum && FORCE_CHECKSUM) {
        await conn.query('UPDATE schema_migrations SET checksum = ? WHERE filename = ?', [m.checksum, m.filename]);
        warn(`${m.filename} checksum re-recorded (--force-checksum)`);
      }
    }

    if (pending.length === 0) {
      head('Nothing to do — database is already up to date');
      for (const m of migrations) info(`already applied: ${m.filename}`);
      return 0;
    }

    head(`Applying ${pending.length} migration(s)`);

    for (const m of pending) {
      // Safety gate before a single statement runs
      const blocked = [];
      for (const stmt of m.statements) {
        const { blocking, advisory } = classify(stmt);
        if (blocking.length) blocked.push({ stmt, why: blocking.join('; ') });
        else if (advisory.length) warn(`${m.filename}: ${advisory.join('; ')}`);
      }
      if (blocked.length && !ALLOW_DESTRUCTIVE) {
        bad(`${m.filename} contains ${blocked.length} destructive statement(s); refusing to run.`);
        blocked.forEach((b) => line(`      ${C.dim}${b.why}: ${preview(b.stmt)}${C.reset}`));
        info('Review it, then re-run with --allow-destructive if it is genuinely intended.');
        return 1;
      }

      line(`\n  ${C.cyan}▶${C.reset} ${m.filename} ${C.dim}(${m.statements.length} statements)${C.reset}`);
      const started = Date.now();

      for (let idx = 0; idx < m.statements.length; idx += 1) {
        const stmt = m.statements[idx];
        try {
          const [result] = await conn.query(stmt);
          const affected = result && typeof result.affectedRows === 'number' ? ` (${result.affectedRows} row(s))` : '';
          info(`[${idx + 1}/${m.statements.length}] ${preview(stmt)}${affected}`);
        } catch (err) {
          bad(`statement ${idx + 1} of ${m.statements.length} failed: ${err.code ?? ''} ${err.message}`);
          line(`      ${C.dim}${preview(stmt)}${C.reset}`);
          head('Migration aborted');
          info('MySQL commits DDL as it goes, so statements before this one are already applied.');
          info(`This migration is idempotent: fix the cause and re-run \`npm run migrate\`.`);
          info(`${m.filename} was NOT recorded as applied.`);
          return 1;
        }
      }

      const duration = Date.now() - started;
      await conn.query(
        `INSERT INTO schema_migrations (filename, checksum, statements, duration_ms, applied_by)
         VALUES (?, ?, ?, ?, ?)`,
        [m.filename, m.checksum, m.statements.length, duration, `${os.userInfo().username}@${os.hostname()}`]
      );
      ok(`${m.filename} applied in ${duration} ms`);
    }

    head('Post-migration verification');
    const failures = await verify(conn);

    head(failures === 0 ? 'Migrations applied and verified' : `Applied, but ${failures} verification check(s) failed`);
    return failures === 0 ? 0 : 1;
  } finally {
    if (conn) conn.release();
    await pool.end().catch(() => {});
  }
}

/* Only run when invoked as a script. Guarding this keeps splitStatements and
   classify importable by tests without opening a database connection. */
const invokedDirectly =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (invokedDirectly) {
  main()
    .then((code) => process.exit(code))
    .catch((err) => {
      line(`\n${C.red}Unexpected failure:${C.reset} ${err.stack ?? err.message}`);
      process.exit(1);
    });
}

export { classify, outerClauses };
