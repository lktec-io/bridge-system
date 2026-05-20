import pool   from '../config/database.js';
import logger from '../utils/logger.js';

const INTERVAL_MS       = 24 * 60 * 60 * 1000; // every 24 hours
const OVERDUE_MONTHS    = 6;

async function checkOverdueBridges() {
  try {
    const [rows] = await pool.query(`
      SELECT
        b.id,
        b.serial_number,
        b.section,
        MAX(i.inspection_date) AS last_inspection
      FROM bridges b
      LEFT JOIN inspections i ON i.bridge_id = b.id
      GROUP BY b.id, b.serial_number, b.section
      HAVING last_inspection IS NULL
          OR last_inspection < DATE_SUB(NOW(), INTERVAL ? MONTH)
      ORDER BY last_inspection ASC
    `, [OVERDUE_MONTHS]);

    if (!rows.length) {
      logger.info(`[Cron] All bridges inspected within the last ${OVERDUE_MONTHS} months`);
      return;
    }

    logger.warn(`[Cron] ${rows.length} bridge(s) overdue for inspection (>${OVERDUE_MONTHS} months):`);
    for (const b of rows) {
      const lastDate = b.last_inspection
        ? new Date(b.last_inspection).toLocaleDateString('en-GB')
        : 'Never inspected';
      logger.warn(`  → [${b.serial_number}] ${b.section} — Last: ${lastDate}`);
    }
  } catch (err) {
    logger.error('[Cron] Inspection reminder check failed', err);
  }
}

export function startInspectionReminder() {
  logger.info('[Cron] Inspection reminder job started — runs every 24 hours');
  checkOverdueBridges();
  setInterval(checkOverdueBridges, INTERVAL_MS);
}
