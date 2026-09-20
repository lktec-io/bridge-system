import pool, { withTransaction } from '../config/database.js';
import { logHistoryTx } from './historyService.js';

const toISO = (v) => (v ? (v instanceof Date ? v.toISOString() : new Date(v).toISOString()) : null);

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
    approvedByUserId:  r.approved_by_user_id ?? null,
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

/**
 * `approved_by_user_id` arrives with migration 002. Detected once and cached
 * so the approval path keeps working on a database where the migration has
 * not been applied yet, instead of failing with ER_BAD_FIELD_ERROR.
 */
let approvalColumnPromise = null;
function hasApprovalColumn() {
  approvalColumnPromise ??= pool
    .query(
      `SELECT COUNT(*) AS n FROM information_schema.columns
       WHERE table_schema = DATABASE() AND table_name = 'inspections'
         AND column_name = 'approved_by_user_id'`
    )
    .then(([rows]) => Number(rows[0].n) > 0)
    .catch(() => false);
  return approvalColumnPromise;
}

// ── reads ─────────────────────────────────────────────────────
export const getAllInspections = async ({ bridgeId, condition, resolved } = {}) => {
  const where  = [];
  const params = [];

  if (bridgeId)  { where.push('i.bridge_id = ?');        params.push(Number(bridgeId)); }
  if (condition) { where.push('i.condition_status = ?');  params.push(condition.toUpperCase()); }
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

export const getInspectionById = async (id) => {
  const [rows] = await pool.query(`${SELECT_SQL} WHERE i.id = ?`, [id]);
  return rows.length ? mapRow(rows[0]) : null;
};

// ── createInspection — atomic: inspection + audit entry ───────
export const createInspection = async (data, userId) => {
  const insertId = await withTransaction(async (conn) => {
    const [result] = await conn.query(
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

    await logHistoryTx(conn, Number(data.bridgeId), userId, 'INSPECTION_ADDED', {}, {
      conditionStatus: data.conditionStatus,
      inspectionDate:  data.inspectionDate,
    });

    return result.insertId;
  });

  // Read after commit so the row reflects trigger side effects
  // (bridges.current_condition is updated by an AFTER INSERT trigger).
  return getInspectionById(insertId);
};

// ── updateInspection — atomic: update + audit entry ───────────
export const updateInspection = async (id, data, userId) => {
  const COL = {
    inspectorName:     'inspector_name',
    inspectionDate:    'inspection_date',
    defectDescription: 'defect_description',
    remedy:            'remedy',
    conditionStatus:   'condition_status',
    lastVisitDate:     'last_visit_date',
  };

  const changed = await withTransaction(async (conn) => {
    // SELECT ... FOR UPDATE: locks the row so a concurrent edit or approval
    // cannot interleave between the read and the write.
    const [before] = await conn.query('SELECT * FROM inspections WHERE id = ? FOR UPDATE', [id]);
    if (!before.length) return false;

    const sets   = [];
    const params = [];

    for (const [jsKey, dbCol] of Object.entries(COL)) {
      if (data[jsKey] === undefined) continue;
      sets.push(`${dbCol} = ?`);
      if (jsKey === 'inspectionDate')      params.push(new Date(data[jsKey]));
      else if (jsKey === 'lastVisitDate')  params.push(data[jsKey] ? new Date(data[jsKey]) : null);
      else                                params.push(data[jsKey] || null);
    }

    if (sets.length) {
      await conn.query(`UPDATE inspections SET ${sets.join(', ')} WHERE id = ?`, [...params, id]);
    }

    await logHistoryTx(conn, before[0].bridge_id, userId, 'INSPECTION_UPDATED',
      { conditionStatus: before[0].condition_status },
      { conditionStatus: data.conditionStatus ?? before[0].condition_status }
    );

    return true;
  });

  return changed ? getInspectionById(id) : null;
};

/**
 * ── resolveInspection — defect sign-off ──────────────────────
 *
 * Returns a discriminated result the controller maps to HTTP status, rather
 * than throwing, because every outcome here is a legitimate business state:
 *
 *   not_found        → 404
 *   no_defect        → 422  nothing to approve
 *   self_approval    → 403  inspector cannot sign off their own defect
 *   already_resolved → 409  idempotent no-op, returns the existing resolution
 *   resolved         → 200  the one path that mutates and audits
 *
 * Concurrency and idempotency come from the UPDATE's own predicate
 * (`is_resolved = 0`), not from a prior read: two simultaneous approvals both
 * pass the pre-check, but only one can match the predicate, so exactly one
 * writes and exactly one audit entry is recorded.
 */
export const resolveInspection = async (id, { resolvedBy, actorId, actorRole } = {}) => {
  const [rows] = await pool.query(
    `SELECT id, bridge_id, user_id, is_resolved, defect_description
     FROM inspections WHERE id = ?`,
    [id]
  );
  if (!rows.length) return { status: 'not_found' };

  const before = rows[0];

  if (!before.defect_description) {
    return { status: 'no_defect', inspection: await getInspectionById(id) };
  }
  if (before.is_resolved) {
    return { status: 'already_resolved', inspection: await getInspectionById(id) };
  }
  // Segregation of duties: the engineer who filed the defect cannot clear it.
  // An ADMIN may override, and that override is visible in the audit entry.
  if (before.user_id && actorId && Number(before.user_id) === Number(actorId) && actorRole !== 'ADMIN') {
    return { status: 'self_approval' };
  }

  const trackApprover = await hasApprovalColumn();

  const applied = await withTransaction(async (conn) => {
    const [result] = await conn.query(
      trackApprover
        ? `UPDATE inspections
           SET is_resolved = 1, resolved_at = NOW(), resolved_by = ?, approved_by_user_id = ?
           WHERE id = ? AND is_resolved = 0 AND defect_description IS NOT NULL`
        : `UPDATE inspections
           SET is_resolved = 1, resolved_at = NOW(), resolved_by = ?
           WHERE id = ? AND is_resolved = 0 AND defect_description IS NOT NULL`,
      trackApprover
        ? [resolvedBy || 'Unknown', actorId ?? null, id]
        : [resolvedBy || 'Unknown', id]
    );

    // Lost the race, or the precondition no longer holds — write no audit entry.
    if (result.affectedRows === 0) return false;

    await logHistoryTx(conn, before.bridge_id, actorId, 'DEFECT_RESOLVED',
      { isResolved: false },
      {
        isResolved: true,
        resolvedBy: resolvedBy || 'Unknown',
        ...(actorRole === 'ADMIN' && Number(before.user_id) === Number(actorId)
          ? { adminSelfApproval: true }
          : {}),
      }
    );

    return true;
  });

  const inspection = await getInspectionById(id);
  return applied
    ? { status: 'resolved', inspection }
    : { status: 'already_resolved', inspection };
};

// ── deleteInspection — hard delete + audit entry ──────────────
export const deleteInspection = async (id, userId) => {
  return withTransaction(async (conn) => {
    const [rows] = await conn.query(
      'SELECT id, bridge_id, condition_status, inspection_date FROM inspections WHERE id = ? FOR UPDATE',
      [id]
    );
    if (!rows.length) return false;

    const ins = rows[0];
    await conn.query('DELETE FROM inspections WHERE id = ?', [id]);

    // Logged before commit so the deletion and its record land together.
    await logHistoryTx(conn, ins.bridge_id, userId, 'INSPECTION_DELETED',
      {
        conditionStatus: ins.condition_status,
        inspectionDate:  toISO(ins.inspection_date),
      },
      {}
    );

    return true;
  });
};
