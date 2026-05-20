import pool from '../config/database.js';
import { logHistory } from './historyService.js';

const toISO = (v) => v ? (v instanceof Date ? v.toISOString() : new Date(v).toISOString()) : null;

function mapRow(r) {
  return {
    id:                r.id,
    bridgeId:          r.bridge_id,
    userId:            r.user_id,
    inspectorName:     r.inspector_name,
    inspectionDate:    toISO(r.inspection_date),
    defectDescription: r.defect_description,
    remedy:            r.remedy,
    conditionStatus:   r.condition_status,
    lastVisitDate:     toISO(r.last_visit_date),
    isResolved:        Boolean(r.is_resolved),
    resolvedAt:        toISO(r.resolved_at),
    resolvedBy:        r.resolved_by,
    createdAt:         toISO(r.created_at),
    updatedAt:         toISO(r.updated_at),
    bridge: r.b_serial ? { serialNumber: r.b_serial, section: r.b_section } : null,
    user:   r.u_fn     ? { id: r.user_id, firstName: r.u_fn, lastName: r.u_ln } : null,
  };
}

const SELECT_SQL = `
  SELECT i.*,
         b.serial_number AS b_serial, b.section AS b_section,
         u.first_name    AS u_fn,     u.last_name AS u_ln
  FROM inspections i
  LEFT JOIN bridges b ON b.id = i.bridge_id
  LEFT JOIN users   u ON u.id = i.user_id
`;

// ── getAllInspections ────────────────────────────────────────
export const getAllInspections = async ({ bridgeId, condition, resolved } = {}) => {
  const where  = [];
  const params = [];

  if (bridgeId)  { where.push('i.bridge_id = ?');       params.push(Number(bridgeId)); }
  if (condition) { where.push('i.condition_status = ?'); params.push(condition.toUpperCase()); }
  if (resolved !== undefined) {
    where.push('i.is_resolved = ?');
    params.push(resolved === 'true' ? 1 : 0);
  }

  const whereSQL = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const [rows] = await pool.query(
    `${SELECT_SQL} ${whereSQL} ORDER BY i.inspection_date DESC, i.id DESC`,
    params
  );
  return rows.map(mapRow);
};

// ── getInspectionById ────────────────────────────────────────
export const getInspectionById = async (id) => {
  const [rows] = await pool.query(`${SELECT_SQL} WHERE i.id = ?`, [id]);
  return rows.length ? mapRow(rows[0]) : null;
};

// ── createInspection ─────────────────────────────────────────
export const createInspection = async (data, userId) => {
  const [result] = await pool.query(
    `INSERT INTO inspections
       (bridge_id, user_id, inspector_name, inspection_date,
        defect_description, remedy, condition_status, last_visit_date)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      Number(data.bridgeId),
      userId ?? null,
      data.inspectorName,
      new Date(data.inspectionDate),
      data.defectDescription || null,
      data.remedy            || null,
      data.conditionStatus,
      data.lastVisitDate ? new Date(data.lastVisitDate) : null,
    ]
  );

  const inspection = await getInspectionById(result.insertId);

  await logHistory(Number(data.bridgeId), userId, 'INSPECTION_ADDED', {}, {
    conditionStatus: inspection.conditionStatus,
    inspectionDate:  inspection.inspectionDate,
  });

  return inspection;
};

// ── updateInspection ─────────────────────────────────────────
export const updateInspection = async (id, data, userId) => {
  const [before] = await pool.query('SELECT * FROM inspections WHERE id = ?', [id]);
  if (!before.length) return null;

  const COL = {
    inspectorName:     'inspector_name',
    inspectionDate:    'inspection_date',
    defectDescription: 'defect_description',
    remedy:            'remedy',
    conditionStatus:   'condition_status',
    lastVisitDate:     'last_visit_date',
  };

  const sets   = [];
  const params = [];

  for (const [jsKey, dbCol] of Object.entries(COL)) {
    if (data[jsKey] !== undefined) {
      sets.push(`${dbCol} = ?`);
      if (jsKey === 'inspectionDate') {
        params.push(new Date(data[jsKey]));
      } else if (jsKey === 'lastVisitDate') {
        params.push(data[jsKey] ? new Date(data[jsKey]) : null);
      } else {
        params.push(data[jsKey] || null);
      }
    }
  }

  if (sets.length) {
    params.push(id);
    await pool.query(`UPDATE inspections SET ${sets.join(', ')} WHERE id = ?`, params);
  }

  const inspection = await getInspectionById(id);

  await logHistory(before[0].bridge_id, userId, 'INSPECTION_UPDATED',
    { conditionStatus: before[0].condition_status },
    { conditionStatus: inspection.conditionStatus }
  );

  return inspection;
};

// ── resolveInspection ────────────────────────────────────────
export const resolveInspection = async (id, resolvedBy, userId) => {
  const [before] = await pool.query('SELECT * FROM inspections WHERE id = ?', [id]);
  if (!before.length) return null;

  await pool.query(
    `UPDATE inspections
     SET is_resolved = 1, resolved_at = NOW(), resolved_by = ?
     WHERE id = ?`,
    [resolvedBy || 'Unknown', id]
  );

  const inspection = await getInspectionById(id);

  await logHistory(before[0].bridge_id, userId, 'DEFECT_RESOLVED',
    { isResolved: false },
    { isResolved: true, resolvedBy: inspection.resolvedBy }
  );

  return inspection;
};

// ── deleteInspection ─────────────────────────────────────────
export const deleteInspection = async (id) => {
  await pool.query('DELETE FROM inspections WHERE id = ?', [id]);
};
