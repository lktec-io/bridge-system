import asyncHandler from '../utils/asyncHandler.js';
import pool         from '../config/database.js';
import * as bridgeService from '../services/bridgeService.js';

const toISO = (v) => v ? (v instanceof Date ? v.toISOString() : new Date(v).toISOString()) : null;

export const getAllBridges = asyncHandler(async (req, res) => {
  const bridges = await bridgeService.getAllBridges(req.query);
  res.json(bridges);
});

export const getBridgeById = asyncHandler(async (req, res) => {
  const bridge = await bridgeService.getBridgeById(Number(req.params.id));
  if (!bridge) return res.status(404).json({ message: 'Bridge not found' });
  res.json(bridge);
});

export const createBridge = asyncHandler(async (req, res) => {
  const data   = sanitize(req.body);
  const bridge = await bridgeService.createBridge(data, req.user?.id);
  res.status(201).json(bridge);
});

export const updateBridge = asyncHandler(async (req, res) => {
  const id     = Number(req.params.id);
  const data   = sanitize(req.body);
  const bridge = await bridgeService.updateBridge(id, data, req.user?.id);
  if (!bridge) return res.status(404).json({ message: 'Bridge not found' });
  res.json(bridge);
});

export const deleteBridge = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const [check] = await pool.query('SELECT id FROM bridges WHERE id = ?', [id]);
  if (!check.length) return res.status(404).json({ message: 'Bridge not found' });
  await bridgeService.deleteBridge(id);
  res.json({ message: 'Bridge deleted successfully' });
});

export const getBridgeHistory = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const [rows] = await pool.query(
    `SELECT hl.id, hl.bridge_id, hl.user_id, hl.action_type,
            hl.old_values, hl.new_values, hl.created_at,
            u.first_name AS user_fn, u.last_name AS user_ln
     FROM history_logs hl
     LEFT JOIN users u ON u.id = hl.user_id
     WHERE hl.bridge_id = ?
     ORDER BY hl.created_at DESC`,
    [id]
  );
  res.json(rows.map(r => ({
    id:         r.id,
    bridgeId:   r.bridge_id,
    userId:     r.user_id,
    actionType: r.action_type,
    oldValues:  typeof r.old_values === 'string' ? JSON.parse(r.old_values) : (r.old_values ?? {}),
    newValues:  typeof r.new_values === 'string' ? JSON.parse(r.new_values) : (r.new_values ?? {}),
    createdAt:  toISO(r.created_at),
    user: r.user_fn ? { id: r.user_id, firstName: r.user_fn, lastName: r.user_ln } : null,
  })));
});

// ── helpers ──────────────────────────────────────────────────
function sanitize(body) {
  const {
    serialNumber, structureType, section, chainage,
    northing, easting, altitude, length, width, height,
    numberOfSpans, remark,
  } = body;

  const d = { serialNumber, structureType, section, chainage: Number(chainage) };

  const opt = (val) => (val !== undefined ? (val ? Number(val) : null) : undefined);
  if (northing      !== undefined) d.northing      = opt(northing);
  if (easting       !== undefined) d.easting       = opt(easting);
  if (altitude      !== undefined) d.altitude      = opt(altitude);
  if (length        !== undefined) d.length        = opt(length);
  if (width         !== undefined) d.width         = opt(width);
  if (height        !== undefined) d.height        = opt(height);
  if (numberOfSpans !== undefined) d.numberOfSpans = numberOfSpans ? Number(numberOfSpans) : null;
  if (remark        !== undefined) d.remark        = remark || null;

  return d;
}
