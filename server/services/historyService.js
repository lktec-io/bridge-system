import pool from '../config/database.js';

export const logHistory = async (bridgeId, userId, actionType, oldValues = {}, newValues = {}) => {
  try {
    await pool.query(
      `INSERT INTO history_logs (bridge_id, user_id, action_type, old_values, new_values)
       VALUES (?, ?, ?, ?, ?)`,
      [bridgeId, userId ?? null, actionType, JSON.stringify(oldValues), JSON.stringify(newValues)]
    );
  } catch (err) {
    // Never crash the calling operation due to a history log failure
    console.error('[history] log failed:', err.message);
  }
};
