import pool, { withTransaction } from '../config/database.js';
import { logHistoryTx } from './historyService.js';

const toISO = (v) => (v ? (v instanceof Date ? v.toISOString() : new Date(v).toISOString()) : null);

/* Latest inspection per bridge. Index-backed by idx_ins_bridge_date
   (bridge_id, inspection_date DESC) — only ever evaluated for the rows on the
   requested page, never across the whole table. */
const LATEST_INS_JOIN = `
  LEFT JOIN inspections li ON li.id = (
    SELECT id FROM inspections
    WHERE bridge_id = b.id
    ORDER BY inspection_date DESC, id DESC
    LIMIT 1
  )
`;

/* ORDER BY is built from a whitelist — never from raw user input. */
const SORT_COLUMNS = {
  created:   'b.created_at',
  serial:    'b.serial_number',
  chainage:  'b.chainage',
  condition: 'b.current_condition',
  name:      'b.bridge_name',
  updated:   'b.updated_at',
};

const MAX_LIMIT = 100;

function mapBridgeRow(r) {
  return {
    id:               r.id,
    serialNumber:     r.serial_number,
    bridgeName:       r.bridge_name ?? null,
    structureType:    r.structure_type,
    constructionYear: r.construction_year ?? null,
    section:          r.section,
    chainage:         r.chainage,
    northing:         r.northing   ?? null,
    easting:          r.easting    ?? null,
    altitude:         r.altitude   ?? null,
    length:           r.length     ?? null,
    width:            r.width      ?? null,
    height:           r.height     ?? null,
    numberOfSpans:    r.number_of_spans ?? null,
    currentCondition: r.current_condition ?? null,
    remark:           r.remark     ?? null,
    createdAt:        toISO(r.created_at),
    updatedAt:        toISO(r.updated_at),
  };
}

function mapLatestIns(r) {
  if (!r.li_id) return [];
  return [{
    id:                r.li_id,
    inspectorName:     r.li_inspector_name,
    inspectionDate:    toISO(r.li_inspection_date),
    conditionStatus:   r.li_condition_status,
    defectDescription: r.li_defect_description,
    remedy:            r.li_remedy,
    lastVisitDate:     toISO(r.li_last_visit_date),
    isResolved:        Boolean(r.li_is_resolved),
    resolvedAt:        toISO(r.li_resolved_at),
    resolvedBy:        r.li_resolved_by,
    userId:            r.li_user_id,
    createdAt:         toISO(r.li_created_at),
  }];
}

/**
 * Build the WHERE clause shared by the count and the page query.
 *
 * Every filter is expressed in SQL. The previous implementation selected the
 * entire table and filtered with `Array.prototype.filter`, which made
 * pagination impossible and left idx_bridges_current_condition unused.
 *
 * `condition` filters the trigger-maintained `bridges.current_condition`
 * column rather than recomputing the latest inspection per row.
 */
function buildWhere({ search, condition, dateFilter }) {
  const where  = [];
  const params = [];

  if (search) {
    where.push('(b.serial_number LIKE ? OR b.bridge_name LIKE ? OR b.section LIKE ? OR b.structure_type LIKE ?)');
    const like = `%${search}%`;
    params.push(like, like, like, like);
  }

  if (condition) {
    const c = String(condition).toUpperCase();
    if (c === 'NEVER' || c === 'UNINSPECTED') {
      where.push('b.current_condition IS NULL');
    } else if (['GOOD', 'FAIR', 'POOR'].includes(c)) {
      where.push('b.current_condition = ?');
      params.push(c);
    }
  }

  if (dateFilter) {
    const latest = '(SELECT MAX(i2.inspection_date) FROM inspections i2 WHERE i2.bridge_id = b.id)';
    switch (String(dateFilter)) {
      case 'never':
        where.push('NOT EXISTS (SELECT 1 FROM inspections i2 WHERE i2.bridge_id = b.id)');
        break;
      case 'recent':
        where.push(`${latest} >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)`);
        break;
      case '3months':
        where.push(`${latest} >= DATE_SUB(CURDATE(), INTERVAL 90 DAY)`);
        break;
      case 'year':
        where.push(`YEAR(${latest}) = YEAR(CURDATE())`);
        break;
      case 'overdue':
        where.push(`(${latest} IS NULL OR ${latest} < DATE_SUB(CURDATE(), INTERVAL 6 MONTH))`);
        break;
      default:
        break;
    }
  }

  return { whereSQL: where.length ? `WHERE ${where.join(' AND ')}` : '', params };
}

/**
 * ── getAllBridges — server-side paginated ────────────────────
 *
 * Two-step by design:
 *   1. Select only the IDs for this page — filtered, sorted, LIMIT/OFFSET,
 *      no joins and no subquery per row.
 *   2. Hydrate just those rows with their latest inspection and counts.
 *
 * A single query with the join plus LIMIT would make MySQL evaluate the
 * correlated subquery for every candidate row before discarding all but the
 * page. This keeps per-row work proportional to the page, not the table.
 *
 * Returns { rows, total, page, limit, pages }.
 */
export const getAllBridges = async ({
  page = 1, limit = 25, search = '', condition = '', dateFilter = '',
  sortBy = 'created', sortDir = 'desc',
} = {}) => {
  const safeLimit = Math.min(Math.max(Number(limit) || 25, 1), MAX_LIMIT);
  const safePage  = Math.max(Number(page) || 1, 1);
  const offset    = (safePage - 1) * safeLimit;

  const orderCol = SORT_COLUMNS[sortBy] ?? SORT_COLUMNS.created;
  const orderDir = String(sortDir).toLowerCase() === 'asc' ? 'ASC' : 'DESC';

  const { whereSQL, params } = buildWhere({ search, condition, dateFilter });

  const [[[{ total }]], [idRows]] = await Promise.all([
    pool.query(`SELECT COUNT(*) AS total FROM bridges b ${whereSQL}`, params),
    pool.query(
      `SELECT b.id FROM bridges b
       ${whereSQL}
       ORDER BY ${orderCol} ${orderDir}, b.id DESC
       LIMIT ? OFFSET ?`,
      [...params, safeLimit, offset]
    ),
  ]);

  const ids = idRows.map((r) => r.id);
  if (ids.length === 0) {
    return { rows: [], total: Number(total), page: safePage, limit: safeLimit, pages: Math.max(Math.ceil(Number(total) / safeLimit), 1) };
  }

  const placeholders = ids.map(() => '?').join(', ');
  const [rows] = await pool.query(
    `SELECT
       b.id, b.serial_number, b.bridge_name, b.construction_year,
       b.structure_type, b.section, b.chainage,
       b.northing, b.easting, b.altitude, b.length, b.width, b.height,
       b.number_of_spans, b.current_condition, b.remark, b.created_at, b.updated_at,
       (SELECT COUNT(*) FROM inspections WHERE bridge_id = b.id) AS inspection_count,
       li.id                  AS li_id,
       li.inspector_name      AS li_inspector_name,
       li.inspection_date     AS li_inspection_date,
       li.condition_status    AS li_condition_status,
       li.defect_description  AS li_defect_description,
       li.remedy              AS li_remedy,
       li.last_visit_date     AS li_last_visit_date,
       li.is_resolved         AS li_is_resolved,
       li.resolved_at         AS li_resolved_at,
       li.resolved_by         AS li_resolved_by,
       li.user_id             AS li_user_id,
       li.created_at          AS li_created_at
     FROM bridges b
     ${LATEST_INS_JOIN}
     WHERE b.id IN (${placeholders})
     ORDER BY FIELD(b.id, ${placeholders})`,
    [...ids, ...ids]
  );

  return {
    rows: rows.map((r) => ({
      ...mapBridgeRow(r),
      _count:      { inspections: Number(r.inspection_count) },
      inspections: mapLatestIns(r),
    })),
    total: Number(total),
    page:  safePage,
    limit: safeLimit,
    pages: Math.max(Math.ceil(Number(total) / safeLimit), 1),
  };
};

/**
 * ── getBridgePositions — map payload ─────────────────────────
 *
 * Eight columns for structures that actually have coordinates, instead of the
 * full record set the GIS view used to pull. Roughly 60 bytes per structure
 * against ~1 KB, and it never touches inspections: condition comes from the
 * trigger-maintained column.
 */
export const getBridgePositions = async () => {
  const [rows] = await pool.query(
    `SELECT id, serial_number, bridge_name, structure_type, section, chainage,
            northing, easting, altitude, current_condition
     FROM bridges
     WHERE northing IS NOT NULL AND easting IS NOT NULL
     ORDER BY serial_number ASC`
  );

  return rows.map((r) => ({
    id:            r.id,
    serialNumber:  r.serial_number,
    bridgeName:    r.bridge_name ?? null,
    structureType: r.structure_type,
    section:       r.section,
    chainage:      r.chainage,
    northing:      r.northing,
    easting:       r.easting,
    altitude:      r.altitude ?? null,
    condition:     r.current_condition ?? 'UNINSPECTED',
  }));
};

/** Lightweight id + label list for form pickers — no inspection data. */
export const getBridgeOptions = async () => {
  const [rows] = await pool.query(
    `SELECT id, serial_number, bridge_name, section
     FROM bridges ORDER BY serial_number ASC`
  );
  return rows.map((r) => ({
    id:           r.id,
    serialNumber: r.serial_number,
    bridgeName:   r.bridge_name ?? null,
    section:      r.section,
  }));
};

// ── getBridgeById ─────────────────────────────────────────────
export const getBridgeById = async (id, { inspectionLimit = 100 } = {}) => {
  const [bridgeRows] = await pool.query('SELECT * FROM bridges WHERE id = ?', [id]);
  if (!bridgeRows.length) return null;

  const cap = Math.min(Math.max(Number(inspectionLimit) || 100, 1), 500);

  const [insRows, photoRows, histRows, [countRow]] = await Promise.all([
    pool.query(
      `SELECT i.*, u.first_name AS user_fn, u.last_name AS user_ln
       FROM inspections i
       LEFT JOIN users u ON u.id = i.user_id
       WHERE i.bridge_id = ?
       ORDER BY i.inspection_date DESC, i.id DESC
       LIMIT ?`,
      [id, cap]
    ),
    pool.query('SELECT * FROM photos WHERE bridge_id = ? ORDER BY created_at DESC', [id]),
    pool.query(
      `SELECT hl.*, u.first_name AS user_fn, u.last_name AS user_ln
       FROM history_logs hl
       LEFT JOIN users u ON u.id = hl.user_id
       WHERE hl.bridge_id = ?
       ORDER BY hl.created_at DESC
       LIMIT 30`,
      [id]
    ),
    pool.query('SELECT COUNT(*) AS cnt FROM inspections WHERE bridge_id = ?', [id]),
  ]);

  const parse = (v) => (typeof v === 'string' ? JSON.parse(v) : (v ?? {}));

  return {
    ...mapBridgeRow(bridgeRows[0]),
    _count: { inspections: Number(countRow[0].cnt) },
    // True when the profile is showing a capped slice of a long history
    inspectionsTruncated: Number(countRow[0].cnt) > insRows[0].length,

    inspections: insRows[0].map((r) => ({
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
      user: r.user_fn ? { id: r.user_id, firstName: r.user_fn, lastName: r.user_ln } : null,
    })),

    photos: photoRows[0].map((r) => ({
      id:        r.id,
      bridgeId:  r.bridge_id,
      photoUrl:  r.photo_url,
      photoType: r.photo_type,
      publicId:  r.public_id,
      createdAt: toISO(r.created_at),
    })),

    historyLogs: histRows[0].map((r) => ({
      id:         r.id,
      bridgeId:   r.bridge_id,
      userId:     r.user_id,
      actionType: r.action_type,
      oldValues:  parse(r.old_values),
      newValues:  parse(r.new_values),
      createdAt:  toISO(r.created_at),
      user: r.user_fn ? { id: r.user_id, firstName: r.user_fn, lastName: r.user_ln } : null,
    })),
  };
};

// ── createBridge — atomic: insert + audit entry ───────────────
export const createBridge = async (data, userId) => {
  const insertId = await withTransaction(async (conn) => {
    const [result] = await conn.query(
      `INSERT INTO bridges
         (serial_number, bridge_name, structure_type, section, chainage,
          northing, easting, altitude, length, width, height, number_of_spans,
          construction_year, remark, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.serialNumber, data.bridgeName ?? null,
        data.structureType, data.section, data.chainage,
        data.northing ?? null, data.easting ?? null, data.altitude ?? null,
        data.length   ?? null, data.width   ?? null, data.height   ?? null,
        data.numberOfSpans ?? null, data.constructionYear ?? null,
        data.remark ?? null, userId ?? null,
      ]
    );

    await logHistoryTx(conn, result.insertId, userId, 'CREATE', {}, {
      serialNumber: data.serialNumber,
      section:      data.section,
    });

    return result.insertId;
  });

  const [rows] = await pool.query('SELECT * FROM bridges WHERE id = ?', [insertId]);
  return {
    ...mapBridgeRow(rows[0]),
    inspections: [], photos: [], historyLogs: [], _count: { inspections: 0 },
  };
};

// ── updateBridge — atomic: update + audit entry ───────────────
export const updateBridge = async (id, data, userId) => {
  const COL = {
    serialNumber:     'serial_number',
    bridgeName:       'bridge_name',
    constructionYear: 'construction_year',
    structureType:    'structure_type',
    section:          'section',
    chainage:         'chainage',
    northing:         'northing',
    easting:          'easting',
    altitude:         'altitude',
    length:           'length',
    width:            'width',
    height:           'height',
    numberOfSpans:    'number_of_spans',
    remark:           'remark',
  };

  const found = await withTransaction(async (conn) => {
    const [before] = await conn.query('SELECT * FROM bridges WHERE id = ? FOR UPDATE', [id]);
    if (!before.length) return false;

    const sets      = [];
    const params    = [];
    const oldValues = {};
    const newValues = {};

    for (const [jsKey, dbCol] of Object.entries(COL)) {
      if (data[jsKey] === undefined) continue;
      sets.push(`${dbCol} = ?`);
      params.push(data[jsKey] ?? null);
      if (String(data[jsKey]) !== String(before[0][dbCol])) {
        oldValues[jsKey] = before[0][dbCol];
        newValues[jsKey] = data[jsKey];
      }
    }

    if (sets.length) {
      await conn.query(`UPDATE bridges SET ${sets.join(', ')} WHERE id = ?`, [...params, id]);
    }

    // Only audit a real change — an update that changed nothing is not an event
    if (Object.keys(newValues).length) {
      await logHistoryTx(conn, id, userId, 'UPDATE', oldValues, newValues);
    }

    return true;
  });

  return found ? getBridgeById(id) : null;
};

// ── deleteBridge — hard delete, cascades to children ──────────
export const deleteBridge = async (id, userId) => {
  return withTransaction(async (conn) => {
    const [rows] = await conn.query(
      'SELECT id, serial_number, section FROM bridges WHERE id = ? FOR UPDATE',
      [id]
    );
    if (!rows.length) return false;

    /* history_logs.bridge_id is ON DELETE CASCADE, so the structure's own audit
       trail goes with it — the deletion is recorded with bridge_id NULL-safe
       values in the payload instead, before the row disappears. */
    await logHistoryTx(conn, id, userId, 'BRIDGE_DELETED',
      { serialNumber: rows[0].serial_number, section: rows[0].section },
      {}
    );

    await conn.query('DELETE FROM bridges WHERE id = ?', [id]);
    return true;
  });
};
