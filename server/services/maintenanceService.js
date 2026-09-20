import pool, { withTransaction } from '../config/database.js';
import { logHistoryTx } from './historyService.js';

const toISO = (v) => v ? (v instanceof Date ? v.toISOString() : new Date(v).toISOString()) : null;
const num   = (v) => (v === null || v === undefined ? null : Number(v));

const TYPES    = ['ROUTINE', 'PREVENTIVE', 'EMERGENCY', 'REHABILITATION'];
const STATUSES = ['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];

export const MAINTENANCE_TYPES    = TYPES;
export const MAINTENANCE_STATUSES = STATUSES;

const SELECT_SQL = `
  SELECT m.id, m.bridge_id, m.maintenance_type, m.description, m.cost,
         m.maintenance_date, m.performed_by, m.status, m.created_by, m.created_at,
         b.serial_number AS b_serial, b.section AS b_section, b.structure_type AS b_structure,
         u.first_name    AS u_fn,     u.last_name AS u_ln
  FROM maintenance_records m
  LEFT JOIN bridges b ON b.id = m.bridge_id
  LEFT JOIN users   u ON u.id = m.created_by
`;

function mapRow(r) {
  return {
    id:              r.id,
    bridgeId:        r.bridge_id,
    maintenanceType: r.maintenance_type,
    description:     r.description,
    cost:            num(r.cost),
    maintenanceDate: toISO(r.maintenance_date),
    performedBy:     r.performed_by,
    status:          r.status,
    createdBy:       r.created_by,
    createdAt:       toISO(r.created_at),
    bridge: r.b_serial
      ? { serialNumber: r.b_serial, section: r.b_section, structureType: r.b_structure }
      : null,
    createdByUser: r.u_fn ? { firstName: r.u_fn, lastName: r.u_ln } : null,
  };
}

// ── list ──────────────────────────────────────────────────────
export const listMaintenance = async ({ bridgeId, status, type, search, limit } = {}) => {
  const where  = [];
  const params = [];

  if (bridgeId) { where.push('m.bridge_id = ?');       params.push(Number(bridgeId)); }
  if (status)   { where.push('m.status = ?');           params.push(String(status).toUpperCase()); }
  if (type)     { where.push('m.maintenance_type = ?'); params.push(String(type).toUpperCase()); }
  if (search) {
    where.push('(b.serial_number LIKE ? OR b.section LIKE ? OR m.performed_by LIKE ? OR m.description LIKE ?)');
    const like = `%${search}%`;
    params.push(like, like, like, like);
  }

  const whereSQL = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const capped   = Math.min(Number(limit) || 200, 500);

  const [rows] = await pool.query(
    `${SELECT_SQL} ${whereSQL} ORDER BY m.maintenance_date DESC, m.id DESC LIMIT ?`,
    [...params, capped]
  );
  return rows.map(mapRow);
};

// ── read one ──────────────────────────────────────────────────
export const getMaintenanceById = async (id) => {
  const [rows] = await pool.query(`${SELECT_SQL} WHERE m.id = ?`, [id]);
  return rows.length ? mapRow(rows[0]) : null;
};

// ── create ────────────────────────────────────────────────────
export const createMaintenance = async (data, userId) => {
  const type   = TYPES.includes(String(data.maintenanceType).toUpperCase())
    ? String(data.maintenanceType).toUpperCase() : 'ROUTINE';
  const status = STATUSES.includes(String(data.status).toUpperCase())
    ? String(data.status).toUpperCase() : 'PLANNED';

  // Work order and its audit entry commit together or not at all.
  const insertId = await withTransaction(async (conn) => {
    const [result] = await conn.query(
      `INSERT INTO maintenance_records
         (bridge_id, maintenance_type, description, cost, maintenance_date, performed_by, status, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        Number(data.bridgeId),
        type,
        data.description,
        data.cost === '' || data.cost === undefined || data.cost === null ? null : Number(data.cost),
        new Date(data.maintenanceDate),
        data.performedBy,
        status,
        userId ?? null,
      ]
    );

    await logHistoryTx(conn, Number(data.bridgeId), userId, 'MAINTENANCE_LOGGED', {}, {
      maintenanceType: type,
      status,
      maintenanceDate: data.maintenanceDate,
    });

    return result.insertId;
  });

  return getMaintenanceById(insertId);
};

// ── update ────────────────────────────────────────────────────
export const updateMaintenance = async (id, data, userId) => {
  const COL = {
    maintenanceType: 'maintenance_type',
    description:     'description',
    cost:            'cost',
    maintenanceDate: 'maintenance_date',
    performedBy:     'performed_by',
    status:          'status',
  };

  const found = await withTransaction(async (conn) => {
    // Locked read: a concurrent status change cannot interleave with this one.
    const [before] = await conn.query(
      'SELECT * FROM maintenance_records WHERE id = ? FOR UPDATE', [id]
    );
    if (!before.length) return false;

    const sets   = [];
    const params = [];

    for (const [jsKey, dbCol] of Object.entries(COL)) {
      if (data[jsKey] === undefined) continue;

      if (jsKey === 'maintenanceType') {
        const v = String(data[jsKey]).toUpperCase();
        if (!TYPES.includes(v)) continue;
        sets.push(`${dbCol} = ?`); params.push(v);
      } else if (jsKey === 'status') {
        const v = String(data[jsKey]).toUpperCase();
        if (!STATUSES.includes(v)) continue;
        sets.push(`${dbCol} = ?`); params.push(v);
      } else if (jsKey === 'maintenanceDate') {
        sets.push(`${dbCol} = ?`); params.push(new Date(data[jsKey]));
      } else if (jsKey === 'cost') {
        sets.push(`${dbCol} = ?`);
        params.push(data[jsKey] === '' || data[jsKey] === null ? null : Number(data[jsKey]));
      } else {
        sets.push(`${dbCol} = ?`); params.push(data[jsKey] || null);
      }
    }

    if (sets.length) {
      await conn.query(
        `UPDATE maintenance_records SET ${sets.join(', ')} WHERE id = ?`, [...params, id]
      );
    }

    // Audit only a real status transition
    const nextStatus = data.status !== undefined ? String(data.status).toUpperCase() : before[0].status;
    if (nextStatus !== before[0].status && STATUSES.includes(nextStatus)) {
      await logHistoryTx(conn, before[0].bridge_id, userId, 'MAINTENANCE_UPDATED',
        { status: before[0].status },
        { status: nextStatus }
      );
    }

    return true;
  });

  return found ? getMaintenanceById(id) : null;
};

// ── delete ────────────────────────────────────────────────────
export const deleteMaintenance = async (id, userId) => {
  return withTransaction(async (conn) => {
    const [rows] = await conn.query(
      'SELECT bridge_id, maintenance_type, status FROM maintenance_records WHERE id = ? FOR UPDATE',
      [id]
    );
    if (!rows.length) return false;

    await logHistoryTx(conn, rows[0].bridge_id, userId, 'MAINTENANCE_DELETED',
      { maintenanceType: rows[0].maintenance_type, status: rows[0].status },
      {}
    );

    await conn.query('DELETE FROM maintenance_records WHERE id = ?', [id]);
    return true;
  });
};

// ── summary (dashboard + alerts) ──────────────────────────────
export const getMaintenanceSummary = async () => {
  const [[statusRows], [[{ emergencyOpen }]], [[{ plannedOverdue }]], [[{ spendYtd }]]] = await Promise.all([
    pool.query(`SELECT status, COUNT(*) AS cnt FROM maintenance_records GROUP BY status`),
    pool.query(`
      SELECT COUNT(*) AS emergencyOpen
      FROM maintenance_records
      WHERE maintenance_type = 'EMERGENCY' AND status IN ('PLANNED', 'IN_PROGRESS')
    `),
    pool.query(`
      SELECT COUNT(*) AS plannedOverdue
      FROM maintenance_records
      WHERE status IN ('PLANNED', 'IN_PROGRESS') AND maintenance_date < CURDATE()
    `),
    pool.query(`
      SELECT COALESCE(SUM(cost), 0) AS spendYtd
      FROM maintenance_records
      WHERE status = 'COMPLETED' AND YEAR(maintenance_date) = YEAR(CURDATE())
    `),
  ]);

  const byStatus = { PLANNED: 0, IN_PROGRESS: 0, COMPLETED: 0, CANCELLED: 0 };
  for (const r of statusRows) byStatus[r.status] = Number(r.cnt);

  return {
    byStatus,
    emergencyOpen:  Number(emergencyOpen),
    plannedOverdue: Number(plannedOverdue),
    spendYtd:       Number(spendYtd),
    open:           byStatus.PLANNED + byStatus.IN_PROGRESS,
  };
};
