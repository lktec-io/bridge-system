import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host:               process.env.DB_HOST     || '127.0.0.1',
  port:               Number(process.env.DB_PORT || 3306),
  user:               process.env.DB_USER     || 'root',
  password:           process.env.DB_PASSWORD || '',
  database:           process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit:    10,
  queueLimit:         0,
  charset:            'utf8mb4',
  timezone:           '+00:00',
  dateStrings:        false,
});

export async function testConnection() {
  const conn = await pool.getConnection();
  await conn.ping();
  conn.release();
}

/**
 * Run `work` inside a single MySQL transaction on one dedicated connection.
 *
 * Every multi-statement write in this system (insert + audit log, update +
 * audit log, approval + audit log) must go through here. Without it, a crash
 * between statements leaves an inspection with no history entry — an audit
 * trail with holes is worse than none, because it looks complete.
 *
 *   const inspection = await withTransaction(async (conn) => {
 *     const [res] = await conn.query('INSERT ...');
 *     await conn.query('INSERT INTO history_logs ...');
 *     return res.insertId;
 *   });
 *
 * The connection is always released, and the transaction is rolled back on
 * any throw. Side effects that are NOT part of the atomic unit (notifications,
 * telemetry) belong after the call returns, never inside it.
 */
export async function withTransaction(work) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await work(conn);
    await conn.commit();
    return result;
  } catch (err) {
    try {
      await conn.rollback();
    } catch (rollbackErr) {
      // Surface rollback failures: the original error is the cause, but a
      // failed rollback means the connection state is suspect.
      console.error('[db] rollback failed:', rollbackErr.message);
    }
    throw err;
  } finally {
    conn.release();
  }
}

export default pool;
