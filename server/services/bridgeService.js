import pool from '../config/database.js';
import { logHistory } from './historyService.js';

// Convert mysql2 date value (Date object or string) to ISO string
const toISO = (v) => v ? (v instanceof Date ? v.toISOString() : new Date(v).toISOString()) : null;

// Shared SQL fragment — latest inspection per bridge joined on bridge id
const LATEST_INS_JOIN = `
  LEFT JOIN inspections li ON li.id = (
    SELECT id FROM inspections
    WHERE bridge_id = b.id
    ORDER BY inspection_date DESC, id DESC
    LIMIT 1
  )
`;

// Map a flat DB row to a bridge JS object (no relations)
function mapBridgeRow(r) {
  return {
    id:            r.id,
    serialNumber:  r.serial_number,
    structureType: r.structure_type,
    section:       r.section,
    chainage:      r.chainage,
    northing:      r.northing   ?? null,
    easting:       r.easting    ?? null,
    altitude:      r.altitude   ?? null,
    length:        r.length     ?? null,
    width:         r.width      ?? null,
    height:        r.height     ?? null,
    numberOfSpans: r.number_of_spans ?? null,
    remark:        r.remark     ?? null,
    createdAt:     toISO(r.created_at),
    updatedAt:     toISO(r.updated_at),
  };
}

// Map inspection columns prefixed with "li_" (used in getAllBridges)
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

// ── getAllBridges ─────────────────────────────────────────────
export const getAllBridges = async ({ search = '', condition = '', dateFilter = '', sortBy = '' } = {}) => {
  let orderBy = 'b.created_at DESC';
  if (sortBy === 'serial')   orderBy = 'b.serial_number ASC';
  if (sortBy === 'chainage') orderBy = 'b.chainage ASC';

  const where  = [];
  const params = [];

  if (search) {
    where.push('(b.serial_number LIKE ? OR b.section LIKE ? OR b.structure_type LIKE ?)');
    const like = `%${search}%`;
    params.push(like, like, like);
  }

  const whereSQL = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const [rows] = await pool.query(
    `SELECT
       b.id, b.serial_number, b.structure_type, b.section, b.chainage,
       b.northing, b.easting, b.altitude, b.length, b.width, b.height,
       b.number_of_spans, b.remark, b.created_at, b.updated_at,
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
     ${whereSQL}
     ORDER BY ${orderBy}`,
    params
  );

  let bridges = rows.map(r => ({
    ...mapBridgeRow(r),
    _count:       { inspections: Number(r.inspection_count) },
    inspections:  mapLatestIns(r),
  }));

  // Post-query filters (condition and dateFilter require inspections data)
  if (condition) {
    const upper = condition.toUpperCase();
    bridges = upper === 'NEVER'
      ? bridges.filter(b => b.inspections.length === 0)
      : bridges.filter(b => b.inspections[0]?.conditionStatus === upper);
  }

  if (dateFilter) {
    const now = Date.now();
    bridges = bridges.filter(b => {
      const raw = b.inspections[0]?.inspectionDate;
      if (dateFilter === 'never')    return !raw;
      if (!raw) return false;
      const ms = Date.now() - new Date(raw).getTime();
      if (dateFilter === 'recent')   return ms <= 30  * 86_400_000;
      if (dateFilter === '3months')  return ms <= 90  * 86_400_000;
      if (dateFilter === 'year')     return new Date(raw).getFullYear() === new Date(now).getFullYear();
      return true;
    });
  }

  return bridges;
};

// ── getBridgeById ─────────────────────────────────────────────
export const getBridgeById = async (id) => {
  const [bridgeRows] = await pool.query('SELECT * FROM bridges WHERE id = ?', [id]);
  if (!bridgeRows.length) return null;

  const [insRows, photoRows, histRows, [countRow]] = await Promise.all([
    pool.query(
      `SELECT i.*,
              u.first_name AS user_fn, u.last_name AS user_ln
       FROM inspections i
       LEFT JOIN users u ON u.id = i.user_id
       WHERE i.bridge_id = ?
       ORDER BY i.inspection_date DESC, i.id DESC`,
      [id]
    ),
    pool.query(
      'SELECT * FROM photos WHERE bridge_id = ? ORDER BY created_at DESC',
      [id]
    ),
    pool.query(
      `SELECT hl.*,
              u.first_name AS user_fn, u.last_name AS user_ln
       FROM history_logs hl
       LEFT JOIN users u ON u.id = hl.user_id
       WHERE hl.bridge_id = ?
       ORDER BY hl.created_at DESC
       LIMIT 30`,
      [id]
    ),
    pool.query('SELECT COUNT(*) AS cnt FROM inspections WHERE bridge_id = ?', [id]),
  ]);

  return {
    ...mapBridgeRow(bridgeRows[0]),
    _count: { inspections: Number(countRow[0].cnt) },

    inspections: insRows[0].map(r => ({
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
      user: r.user_fn ? { id: r.user_id, firstName: r.user_fn, lastName: r.user_ln } : null,
    })),

    photos: photoRows[0].map(r => ({
      id:        r.id,
      bridgeId:  r.bridge_id,
      photoUrl:  r.photo_url,
      photoType: r.photo_type,
      publicId:  r.public_id,
      createdAt: toISO(r.created_at),
    })),

    historyLogs: histRows[0].map(r => ({
      id:         r.id,
      bridgeId:   r.bridge_id,
      userId:     r.user_id,
      actionType: r.action_type,
      oldValues:  typeof r.old_values === 'string' ? JSON.parse(r.old_values) : (r.old_values ?? {}),
      newValues:  typeof r.new_values === 'string' ? JSON.parse(r.new_values) : (r.new_values ?? {}),
      createdAt:  toISO(r.created_at),
      user: r.user_fn ? { id: r.user_id, firstName: r.user_fn, lastName: r.user_ln } : null,
    })),
  };
};

// ── createBridge ─────────────────────────────────────────────
export const createBridge = async (data, userId) => {
  const [result] = await pool.query(
    `INSERT INTO bridges
       (serial_number, structure_type, section, chainage,
        northing, easting, altitude, length, width, height, number_of_spans, remark)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.serialNumber, data.structureType, data.section, data.chainage,
      data.northing ?? null, data.easting   ?? null, data.altitude     ?? null,
      data.length   ?? null, data.width     ?? null, data.height       ?? null,
      data.numberOfSpans ?? null, data.remark ?? null,
    ]
  );

  await logHistory(result.insertId, userId, 'CREATE', {}, { serialNumber: data.serialNumber });

  const [rows] = await pool.query('SELECT * FROM bridges WHERE id = ?', [result.insertId]);
  return { ...mapBridgeRow(rows[0]), inspections: [], photos: [], historyLogs: [], _count: { inspections: 0 } };
};

// ── updateBridge ─────────────────────────────────────────────
export const updateBridge = async (id, data, userId) => {
  const [before] = await pool.query('SELECT * FROM bridges WHERE id = ?', [id]);
  if (!before.length) return null;

  const COL = {
    serialNumber:  'serial_number',
    structureType: 'structure_type',
    section:       'section',
    chainage:      'chainage',
    northing:      'northing',
    easting:       'easting',
    altitude:      'altitude',
    length:        'length',
    width:         'width',
    height:        'height',
    numberOfSpans: 'number_of_spans',
    remark:        'remark',
  };

  const sets      = [];
  const params    = [];
  const oldValues = {};
  const newValues = {};

  for (const [jsKey, dbCol] of Object.entries(COL)) {
    if (data[jsKey] !== undefined) {
      sets.push(`${dbCol} = ?`);
      params.push(data[jsKey] ?? null);
      if (String(data[jsKey]) !== String(before[0][dbCol])) {
        oldValues[jsKey] = before[0][dbCol];
        newValues[jsKey] = data[jsKey];
      }
    }
  }

  if (sets.length) {
    params.push(id);
    await pool.query(`UPDATE bridges SET ${sets.join(', ')} WHERE id = ?`, params);
  }

  if (Object.keys(newValues).length) {
    await logHistory(id, userId, 'UPDATE', oldValues, newValues);
  }

  return getBridgeById(id);
};

// ── deleteBridge ─────────────────────────────────────────────
export const deleteBridge = async (id) => {
  await pool.query('DELETE FROM bridges WHERE id = ?', [id]);
};
