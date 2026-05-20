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

export default pool;
