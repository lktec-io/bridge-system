import asyncHandler from '../utils/asyncHandler.js';
import { listHistory } from '../services/historyService.js';

/**
 * GET /api/history — system-wide audit trail, paginated in MySQL.
 *   ?page=1&limit=50&actionType=DEFECT_RESOLVED&bridgeId=3&userId=2
 *
 * Backs the System Logs screen. Read-only by design: history rows are written
 * inside the transaction that caused them and are never edited afterwards.
 */
export const getHistory = asyncHandler(async (req, res) => {
  const result = await listHistory(req.query);
  res.json(result);
});

/** Distinct action types present in the trail — populates the filter. */
export const getHistoryActions = asyncHandler(async (_req, res) => {
  const { rows } = await listHistory({ limit: 200 });
  const actions = [...new Set(rows.map((r) => r.actionType))].sort();
  res.json(actions);
});
