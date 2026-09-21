/**
 * Tests for the migration runner's SQL splitter and safety classifier.
 *
 *   npm run test:migrate        (from server/, or the repo root)
 *
 * No database and no test framework required — the runner guards its own
 * entry point, so importing it here executes nothing.
 *
 * These two functions are the riskiest code in the migration path: a splitter
 * bug would send a truncated statement to a production database, and a
 * classifier bug would let a destructive statement through unannounced.
 */
import { splitStatements, classify } from './migrate.js';

let pass = 0;
let fail = 0;

function eq(label, actual, expected) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) { pass += 1; console.log(`  ok   ${label}`); }
  else { fail += 1; console.log(`  FAIL ${label}\n       expected ${e}\n       actual   ${a}`); }
}

console.log('\nsplitStatements');

eq('semicolon inside a single-quoted string',
  splitStatements("SELECT ';' AS x; SELECT 2;"),
  ["SELECT ';' AS x", 'SELECT 2']);

eq('doubled-quote escape',
  splitStatements("SELECT 'it''s; here'; SELECT 2;"),
  ["SELECT 'it''s; here'", 'SELECT 2']);

eq('backslash-escaped quote',
  splitStatements("SELECT 'a\\'; b'; SELECT 2;"),
  ["SELECT 'a\\'; b'", 'SELECT 2']);

eq('semicolon inside a backtick identifier',
  splitStatements('SELECT `we;ird` FROM t;'),
  ['SELECT `we;ird` FROM t']);

eq('line comment containing a semicolon is dropped',
  splitStatements('-- comment; with semicolon\nSELECT 1;'),
  ['SELECT 1']);

eq('hash comment is dropped',
  splitStatements('# hash; comment\nSELECT 1;'),
  ['SELECT 1']);

eq('block comment containing a semicolon is dropped',
  splitStatements('/* block ; comment */ SELECT 1;'),
  ['SELECT 1']);

eq('final statement without a trailing delimiter',
  splitStatements('SELECT 1;\nSELECT 2'),
  ['SELECT 1', 'SELECT 2']);

eq('DELIMITER block keeps a trigger body intact',
  splitStatements(
    'DELIMITER //\nCREATE TRIGGER t AFTER INSERT ON x FOR EACH ROW BEGIN UPDATE y SET a=1; UPDATE z SET b=2; END //\nDELIMITER ;\nSELECT 1;'
  ),
  [
    'CREATE TRIGGER t AFTER INSERT ON x FOR EACH ROW BEGIN UPDATE y SET a=1; UPDATE z SET b=2; END',
    'SELECT 1',
  ]);

eq('empty input', splitStatements('   \n  -- nothing\n'), []);

eq('decrement is not mistaken for a comment',
  splitStatements('UPDATE t SET n = n-1;'),
  ['UPDATE t SET n = n-1']);

console.log('\nclassify');

const backfill = `UPDATE bridges b SET b.current_condition = (
  SELECT i.condition_status FROM inspections i WHERE i.bridge_id = b.id
  ORDER BY i.inspection_date DESC LIMIT 1)`;

eq('full-table UPDATE flagged despite WHERE inside its subquery',
  classify(backfill),
  { blocking: [], advisory: ['full-table UPDATE — every row is rewritten'] });

eq('UPDATE with a real WHERE is clean',
  classify('UPDATE bridges SET x = 1 WHERE id = 5'),
  { blocking: [], advisory: [] });

eq('DELETE without WHERE blocks',
  classify('DELETE FROM bridges'),
  { blocking: ['deletes rows without a WHERE clause'], advisory: [] });

eq('DELETE with WHERE is clean',
  classify('DELETE FROM bridges WHERE id = 1'),
  { blocking: [], advisory: [] });

eq('DROP TABLE blocks',
  classify('DROP TABLE bridges'),
  { blocking: ['drops a table or database'], advisory: [] });

eq('ALTER … DROP COLUMN blocks',
  classify('ALTER TABLE inspections DROP COLUMN notes'),
  { blocking: ['drops a column or key'], advisory: [] });

eq('additive ALTER is clean',
  classify('ALTER TABLE inspections ADD COLUMN approved_by_user_id INT UNSIGNED DEFAULT NULL'),
  { blocking: [], advisory: [] });

eq('CREATE TABLE IF NOT EXISTS is clean',
  classify('CREATE TABLE IF NOT EXISTS sensor_devices (id INT)'),
  { blocking: [], advisory: [] });

console.log(`\n${fail === 0 ? 'ALL PASS' : 'FAILURES'}: ${pass} passed, ${fail} failed\n`);
process.exit(fail === 0 ? 0 : 1);
