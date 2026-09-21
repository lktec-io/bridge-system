# Database migrations

Runner: [`server/scripts/migrate.js`](../../scripts/migrate.js). Migrations are plain
`.sql` files in this directory, applied in lexical filename order (`001_`, `002_`, …).

## Commands

Run from the repo root or from `server/` — both work.

| Command | Touches the database | What it does |
|---|---|---|
| `npm run migrate:dry` | **No** — opens no connection | Parses every file, lists each statement, flags anything destructive |
| `npm run migrate:status` | Read-only | Shows applied vs pending, and whether an applied file has since been edited |
| `npm run migrate` | **Yes** | Applies pending migrations, then verifies the result |
| `npm run migrate:verify` | Read-only | Asserts the expected schema state and data integrity |

Extra flags: `--file=002_….sql` (one file only), `--allow-destructive` (required
before any statement that drops or truncates — no current migration needs it),
`--force-checksum` (re-record a checksum after a comments-only edit).

## How it applies safely

- **One pinned connection.** Migration 002 emulates `ADD COLUMN IF NOT EXISTS`
  with session variables plus `PREPARE`/`EXECUTE`. Session state is
  per-connection, so all statements in a file run on a single connection taken
  from the app's own pool. Sending them through the pool would scatter them and
  the existence guards would misfire.
- **Statements are split by the runner**, respecting quotes, comments and
  `DELIMITER` blocks. The pool intentionally does not enable
  `multipleStatements`.
- **A ledger table**, `schema_migrations`, records filename, sha256, statement
  count, duration and who applied it. Re-running is a no-op. If an already
  applied file has changed, the runner refuses and tells you to add a new
  migration instead — applied migrations are immutable.
- **Destructive statements are refused** unless explicitly allowed. Full-table
  `UPDATE`s are allowed but reported (migration 002's backfill is one).
- **Lock waits are bounded** (60s metadata, 30s row) so a migration cannot hang
  behind a long-running query while holding locks of its own.

### DDL cannot be rolled back

MySQL commits DDL as it executes, so a file cannot run inside a transaction. The
mitigation is that **every migration here is idempotent**: if a statement fails,
the earlier ones stay applied, the file is *not* recorded, and re-running
`npm run migrate` continues from a clean state. Write new migrations the same
way — guard with `IF NOT EXISTS` or an `information_schema` check.

## Current migrations

### `001_sensor_telemetry.sql`

Adds `sensor_devices` and `sensor_readings` for the Sensor / IoT Analytics
module. Purely additive: two `CREATE TABLE IF NOT EXISTS` statements, no
existing table is touched. `sensor_readings.id` is `BIGINT` because it is the
only table expected to exceed `INT UNSIGNED`; see the retention note in the file
before connecting real hardware.

### `002_approval_audit_and_indexes.sql`

1. `inspections.approved_by_user_id` + FK `fk_ins_approved_by`
   (`ON DELETE SET NULL`, so a sign-off record survives the operator's account
   being removed). Existing rows get `NULL` — the column is new, so historical
   approvals have no recorded account, which is expected and visible in
   `migrate:verify`.
2. Indexes `idx_bridges_created` and `idx_bridges_cond_created` for server-side
   pagination and the "worst condition first, page N" query.
3. Backfills `bridges.current_condition` from each bridge's newest inspection.

**Why the backfill is safe.** `current_condition` is a *derived* column,
maintained by the `trg_after_ins_*` triggers. The backfill recomputes it from
`inspections`, which is the source of truth and is never written to. Bridges
with no inspections correctly become `NULL`. No inspection, photo, user,
maintenance or history row is read-modified or deleted anywhere in this
migration. It matters now because the API filters on this column.

## Production procedure (Contabo)

The migration must be run **on the server**, where `DB_HOST=127.0.0.1` points at
the local MySQL 8 instance. Remote MySQL is normally closed to the internet, and
should stay that way.

```bash
# 1. Back up first — always, even for additive changes
mysqldump -u <user> -p --single-transaction --routines --triggers <database> \
  > ~/bms-backup-$(date +%F-%H%M).sql

# 2. Inspect without touching anything
cd /var/www/bridge-system
npm run migrate:dry
npm run migrate:status

# 3. Apply
npm run migrate

# 4. Confirm
npm run migrate:verify

# 5. Restart the API so the approval path picks up the new column
pm2 restart <bridge-process-name> --update-env
```

### Locking behaviour, precisely

Not every statement in 002 is a fully online operation:

| Statement | Algorithm | Impact while it runs |
|---|---|---|
| `ADD COLUMN approved_by_user_id` | `INSTANT` (MySQL 8.0.12+) | Metadata change only, effectively instant |
| `ADD KEY idx_bridges_*` | `INPLACE`, `LOCK=NONE` | Concurrent reads **and** writes continue |
| `ADD CONSTRAINT … FOREIGN KEY` | **`COPY`** while `foreign_key_checks=1` | Rebuilds `inspections`; **writes to that table block** until it finishes |
| Backfill `UPDATE bridges` | Row locks | Brief write locks on `bridges` only |

The foreign key is the one to be aware of. On a table of a few thousand
inspections it completes in well under a second, which is why this migration is
safe to run in place. If `inspections` ever grows to millions of rows, take a
maintenance window for that statement, or run it with
`SET SESSION foreign_key_checks = 0` so it can use `INPLACE` — accepting that
existing rows are then not validated against `users` (harmless here, since every
`approved_by_user_id` is `NULL` immediately after the column is added).

Nothing in either migration takes a global lock, and no statement reads and
rewrites inspection, photo, user, maintenance or history content.

Step 5 is not strictly required — the approval path detects at runtime whether
`approved_by_user_id` exists and works either way — but until the API restarts
it will keep using the pre-migration statement and will not record approver ids.

## Verification output

`npm run migrate:verify` checks, and prints a pass/fail line for each:

- both sensor tables and `idx_reading_device_time` exist
- `approved_by_user_id` and its foreign key exist
- both pagination indexes exist
- row counts for bridges, inspections, users, photos and history (proof nothing
  was erased)
- `current_condition` matches the latest inspection for **every** bridge —
  must be 0 mismatches
- the condition distribution across the portfolio
