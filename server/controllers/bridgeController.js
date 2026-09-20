import asyncHandler from '../utils/asyncHandler.js';
import * as bridgeService from '../services/bridgeService.js';
import { listHistory } from '../services/historyService.js';
import { createNotification } from '../services/notificationService.js';

function notify(type, title, message, entityType, entityId) {
  createNotification(type, title, message, entityType, entityId).catch((err) =>
    console.error(`[notify] ${type} failed for ${entityType} ${entityId}: ${err.message}`)
  );
}

/**
 * GET /api/bridges
 *
 * Paginated and filtered in MySQL:
 *   ?page=1&limit=25&search=BRG&condition=POOR&dateFilter=overdue
 *   &sortBy=chainage&sortDir=asc
 *
 * Responds { rows, total, page, limit, pages }. The previous version returned
 * the entire table as a bare array and filtered client-side.
 */
export const getAllBridges = asyncHandler(async (req, res) => {
  const result = await bridgeService.getAllBridges(req.query);
  res.json(result);
});

/** GET /api/bridges/positions — slim payload for the GIS viewport. */
export const getBridgePositions = asyncHandler(async (_req, res) => {
  const positions = await bridgeService.getBridgePositions();
  res.json(positions);
});

/** GET /api/bridges/options — id + label only, for form pickers. */
export const getBridgeOptions = asyncHandler(async (_req, res) => {
  const options = await bridgeService.getBridgeOptions();
  res.json(options);
});

export const getBridgeById = asyncHandler(async (req, res) => {
  const bridge = await bridgeService.getBridgeById(Number(req.params.id), {
    inspectionLimit: req.query.inspectionLimit,
  });
  if (!bridge) return res.status(404).json({ message: 'Bridge not found' });
  res.json(bridge);
});

export const createBridge = asyncHandler(async (req, res) => {
  const data = sanitize(req.body);

  if (!data.serialNumber || !data.structureType || !data.section || Number.isNaN(data.chainage)) {
    return res.status(400).json({
      message: 'serialNumber, structureType, section and a numeric chainage are required',
    });
  }

  const bridge = await bridgeService.createBridge(data, req.user?.id);

  notify(
    'BRIDGE_CREATED',
    'New structure registered',
    `${bridge.serialNumber} has been added to the inventory`,
    'bridge',
    bridge.id
  );

  res.status(201).json(bridge);
});

export const updateBridge = asyncHandler(async (req, res) => {
  const bridge = await bridgeService.updateBridge(Number(req.params.id), sanitize(req.body), req.user?.id);
  if (!bridge) return res.status(404).json({ message: 'Bridge not found' });
  res.json(bridge);
});

export const deleteBridge = asyncHandler(async (req, res) => {
  const removed = await bridgeService.deleteBridge(Number(req.params.id), req.user?.id);
  if (!removed) return res.status(404).json({ message: 'Bridge not found' });
  res.json({ message: 'Bridge deleted successfully' });
});

/** GET /api/bridges/:id/history — paginated slice of one structure's trail. */
export const getBridgeHistory = asyncHandler(async (req, res) => {
  const result = await listHistory({
    bridgeId: Number(req.params.id),
    page:     req.query.page,
    limit:    req.query.limit ?? 100,
  });
  // Historic clients expect a bare array here; keep that shape.
  res.json(result.rows);
});

// ── helpers ──────────────────────────────────────────────────
function sanitize(body) {
  const {
    serialNumber, bridgeName, structureType, section, chainage,
    northing, easting, altitude, length, width, height,
    numberOfSpans, constructionYear, remark,
  } = body;

  const d = { serialNumber, structureType, section, chainage: Number(chainage) };

  const optNum = (val) => (val !== undefined ? (val === '' || val === null ? null : Number(val)) : undefined);

  if (bridgeName       !== undefined) d.bridgeName       = bridgeName || null;
  if (constructionYear !== undefined) d.constructionYear = optNum(constructionYear);
  if (northing         !== undefined) d.northing         = optNum(northing);
  if (easting          !== undefined) d.easting          = optNum(easting);
  if (altitude         !== undefined) d.altitude         = optNum(altitude);
  if (length           !== undefined) d.length           = optNum(length);
  if (width            !== undefined) d.width            = optNum(width);
  if (height           !== undefined) d.height           = optNum(height);
  if (numberOfSpans    !== undefined) d.numberOfSpans    = optNum(numberOfSpans);
  if (remark           !== undefined) d.remark           = remark || null;

  return d;
}
