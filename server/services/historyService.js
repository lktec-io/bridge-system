import pool from '../config/database.js';

const INSERT_SQL = `
  INSERT INTO history_logs (bridge_id, user_id, action_type, old_values, new_values)
  VALUES (?, ?, ?, ?, ?)
`;

/**
 * Write an audit entry INSIDE a transaction.
 *
 * This one throws. If the audit write fails, the whole business write must
 * roll back with it — a bridge update with no corresponding history row is a
 * silent hole in the audit trail, and the trail is the point.
 */
export const logHistoryTx = async (conn, bridgeId, userId, actionType, oldValues = {}, newValues = {}) => {
  await conn.query(INSERT_SQL, [
    bridgeId,
    userId ?? null,
    actionType,
    JSON.stringify(oldValues),
    JSON.stringify(newValues),
  ]);
};

/**
 * Best-effort audit entry for writes that are NOT inside a transaction.
 *
 * Still logs loudly on failure: the previous version swallowed the error into
 * a bare console line, which is how gaps went unnoticed. Prefer logHistoryTx.
 */
export const logHistory = async (bridgeId, userId, actionType, oldValues = {}, newValues = {}) => {
  try {
    await pool.query(INSERT_SQL, [
      bridgeId,
      userId ?? null,
      actionType,
      JSON.stringify(oldValues),
      JSON.stringify(newValues),
    ]);
  } catch (err) {
    console.error(
      `[history] AUDIT WRITE FAILED action=${actionType} bridge=${bridgeId} user=${userId ?? 'null'}: ${err.message}`
    );
  }
};

/**
 * Paginated global audit trail — backs the System Logs screen.
 * Filtering and paging happen in SQL; idx_hist_created and idx_hist_action
 * carry the common cases (newest first, filtered by action type).
 */
export const listHistory = async ({ page = 1, limit = 50, actionType, bridgeId, userId } = {}) => {
  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 200);
  const safePage  = Math.max(Number(page) || 1, 1);
  const offset    = (safePage - 1) * safeLimit;

  const where  = [];
  const params = [];

  if (actionType) { where.push('hl.action_type = ?'); params.push(String(actionType).toUpperCase()); }
  if (bridgeId)   { where.push('hl.bridge_id = ?');   params.push(Number(bridgeId)); }
  if (userId)     { where.push('hl.user_id = ?');     params.push(Number(userId)); }

  const whereSQL = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const [[[{ total }]], [rows]] = await Promise.all([
    pool.query(`SELECT COUNT(*) AS total FROM history_logs hl ${whereSQL}`, params),
    pool.query(
      `SELECT hl.id, hl.bridge_id, hl.user_id, hl.action_type,
              hl.old_values, hl.new_values, hl.created_at,
              u.first_name    AS u_fn,     u.last_name AS u_ln,
              b.serial_number AS b_serial, b.section   AS b_section
       FROM history_logs hl
       LEFT JOIN users   u ON u.id = hl.user_id
       LEFT JOIN bridges b ON b.id = hl.bridge_id
       ${whereSQL}
       ORDER BY hl.created_at DESC, hl.id DESC
       LIMIT ? OFFSET ?`,
      [...params, safeLimit, offset]
    ),
  ]);

  const parse = (v) => (typeof v === 'string' ? JSON.parse(v) : (v ?? {}));
  const toISO = (v) => (v ? (v instanceof Date ? v.toISOString() : new Date(v).toISOString()) : null);

  return {
    rows: rows.map((r) => ({
      id:         r.id,
      bridgeId:   r.bridge_id,
      userId:     r.user_id,
      actionType: r.action_type,
      oldValues:  parse(r.old_values),
      newValues:  parse(r.new_values),
      createdAt:  toISO(r.created_at),
      user:   r.u_fn     ? { firstName: r.u_fn, lastName: r.u_ln } : null,
      bridge: r.b_serial ? { serialNumber: r.b_serial, section: r.b_section } : null,
    })),
    total: Number(total),
    page:  safePage,
    limit: safeLimit,
    pages: Math.max(Math.ceil(Number(total) / safeLimit), 1),
  };
};
