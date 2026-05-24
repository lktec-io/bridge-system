import pool from '../config/database.js';

export async function createTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id          INT AUTO_INCREMENT PRIMARY KEY,
      type        VARCHAR(60)  NOT NULL,
      title       VARCHAR(255) NOT NULL,
      message     TEXT,
      entity_type VARCHAR(30)  NULL,
      entity_id   INT          NULL,
      created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS notification_reads (
      user_id         INT NOT NULL,
      notification_id INT NOT NULL,
      read_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, notification_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
}

export async function createNotification(type, title, message, entityType = null, entityId = null) {
  const [result] = await pool.query(
    'INSERT INTO notifications (type, title, message, entity_type, entity_id) VALUES (?, ?, ?, ?, ?)',
    [type, title, message, entityType, entityId]
  );
  return result.insertId;
}

export async function getNotificationsForUser(userId, limit = 20) {
  const [rows] = await pool.query(
    `SELECT n.id, n.type, n.title, n.message, n.entity_type, n.entity_id, n.created_at,
            IF(nr.user_id IS NOT NULL, 1, 0) AS is_read
     FROM notifications n
     LEFT JOIN notification_reads nr ON nr.notification_id = n.id AND nr.user_id = ?
     ORDER BY n.created_at DESC
     LIMIT ?`,
    [userId, limit]
  );
  return rows.map((r) => ({
    id:         r.id,
    type:       r.type,
    title:      r.title,
    message:    r.message,
    entityType: r.entity_type,
    entityId:   r.entity_id,
    createdAt:  r.created_at instanceof Date ? r.created_at.toISOString() : r.created_at,
    isRead:     Boolean(r.is_read),
  }));
}

export async function markRead(userId, notificationId) {
  await pool.query(
    'INSERT IGNORE INTO notification_reads (user_id, notification_id) VALUES (?, ?)',
    [userId, notificationId]
  );
}

export async function markAllRead(userId) {
  await pool.query(
    `INSERT IGNORE INTO notification_reads (user_id, notification_id)
     SELECT ?, id FROM notifications`,
    [userId]
  );
}
