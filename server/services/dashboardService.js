import pool from '../config/database.js';
import { getMaintenanceSummary } from './maintenanceService.js';
import { getSensorSummary }      from './sensorService.js';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const toISO  = (v) => v ? (v instanceof Date ? v.toISOString() : new Date(v).toISOString()) : null;

/* Bridges are considered overdue after this long without an inspection.
   Matches the threshold used by the inspection reminder job. */
const OVERDUE_MONTHS = 6;

/**
 * Structural Health Index (SHI)
 * ─────────────────────────────
 * A single 0–100 figure for the whole monitored portfolio.
 *
 *   SHI = Σ(condition weight) / number of INSPECTED bridges
 *
 *   GOOD = 100   FAIR = 60   POOR = 20
 *
 * Uninspected structures are deliberately EXCLUDED from the average —
 * counting them as either healthy or failed would be an invention.
 * They are reported separately as `coverage` so the figure can be read
 * honestly: "SHI 74 across 82% of the portfolio".
 */
const HEALTH_WEIGHTS = { GOOD: 100, FAIR: 60, POOR: 20 };

export function computeHealthIndex(counts) {
  const inspected = (counts.GOOD ?? 0) + (counts.FAIR ?? 0) + (counts.POOR ?? 0);
  if (inspected === 0) return null;
  const score =
    (counts.GOOD ?? 0) * HEALTH_WEIGHTS.GOOD +
    (counts.FAIR ?? 0) * HEALTH_WEIGHTS.FAIR +
    (counts.POOR ?? 0) * HEALTH_WEIGHTS.POOR;
  return Math.round(score / inspected);
}

/* Sub-modules must never take the dashboard down. A missing
   maintenance_records or sensor_devices table (migration not yet
   applied) degrades that panel only. */
const EMPTY_MAINTENANCE = {
  byStatus: { PLANNED: 0, IN_PROGRESS: 0, COMPLETED: 0, CANCELLED: 0 },
  emergencyOpen: 0, plannedOverdue: 0, spendYtd: 0, open: 0, available: false,
};
const EMPTY_SENSORS = {
  deviceCount: 0, activeCount: 0, bridgesMonitored: 0,
  byStatus: { OK: 0, WARN: 0, ALARM: 0 }, readings24h: 0,
  instrumented: false, available: false,
};

async function optional(fn, fallback, label) {
  try {
    const value = await fn();
    return { ...value, available: true };
  } catch (err) {
    console.error(`[dashboard] ${label} unavailable: ${err.message}`);
    return fallback;
  }
}

const LATEST_INS_JOIN = `
  LEFT JOIN inspections li ON li.id = (
    SELECT id FROM inspections
    WHERE bridge_id = b.id
    ORDER BY inspection_date DESC, id DESC
    LIMIT 1
  )
`;

export const getDashboardStats = async () => {
  const [
    [[{ totalBridges }]],
    [condRows],
    [[{ recentlyInspected }]],
    [[{ unresolvedDefects }]],
    [[{ withUnresolvedDefects }]],
    [trendRows],
    [poorRows],
    [recentInsRows],
    [activityRows],
  ] = await Promise.all([

    // 1. total bridges
    pool.query('SELECT COUNT(*) AS totalBridges FROM bridges'),

    // 2. condition counts — latest inspection per bridge
    pool.query(`
      SELECT COALESCE(li.condition_status, 'UNINSPECTED') AS status, COUNT(*) AS cnt
      FROM bridges b
      ${LATEST_INS_JOIN}
      GROUP BY COALESCE(li.condition_status, 'UNINSPECTED')
    `),

    // 3. bridges with latest inspection in last 30 days
    pool.query(`
      SELECT COUNT(*) AS recentlyInspected
      FROM bridges b
      ${LATEST_INS_JOIN}
      WHERE li.inspection_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    `),

    // 4. total unresolved defect inspections
    pool.query(`
      SELECT COUNT(*) AS unresolvedDefects
      FROM inspections
      WHERE is_resolved = 0 AND condition_status IN ('POOR','FAIR')
    `),

    // 5. distinct bridges with unresolved defects
    pool.query(`
      SELECT COUNT(DISTINCT bridge_id) AS withUnresolvedDefects
      FROM inspections
      WHERE is_resolved = 0 AND condition_status IN ('POOR','FAIR')
    `),

    // 6. inspection trend — last 6 calendar months
    pool.query(`
      SELECT YEAR(inspection_date) AS yr, MONTH(inspection_date) AS mo, COUNT(*) AS cnt
      FROM inspections
      WHERE inspection_date >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
      GROUP BY yr, mo
      ORDER BY yr, mo
    `),

    // 7. poor-condition bridges with latest inspection details
    pool.query(`
      SELECT b.id, b.serial_number, b.structure_type, b.section, b.chainage,
             li.id                AS li_id,
             li.inspector_name    AS li_inspector_name,
             li.inspection_date   AS li_inspection_date,
             li.condition_status  AS li_condition_status,
             li.defect_description AS li_defect_description
      FROM bridges b
      ${LATEST_INS_JOIN}
      WHERE li.condition_status = 'POOR'
      ORDER BY li.inspection_date DESC
    `),

    // 8. 5 most recent inspections with bridge info
    pool.query(`
      SELECT i.id, i.bridge_id, i.inspector_name, i.inspection_date,
             i.condition_status, i.is_resolved,
             b.serial_number AS b_serial, b.section AS b_section,
             b.bridge_name   AS b_name,   b.structure_type AS b_structure,
             b.chainage      AS b_chainage
      FROM inspections i
      LEFT JOIN bridges b ON b.id = i.bridge_id
      ORDER BY i.inspection_date DESC, i.id DESC
      LIMIT 12
    `),

    // 9. 12 most recent history log entries
    pool.query(`
      SELECT hl.id, hl.bridge_id, hl.user_id, hl.action_type,
             hl.old_values, hl.new_values, hl.created_at,
             u.first_name    AS u_fn,     u.last_name AS u_ln,
             b.serial_number AS b_serial, b.section   AS b_section
      FROM history_logs hl
      LEFT JOIN users   u ON u.id = hl.user_id
      LEFT JOIN bridges b ON b.id = hl.bridge_id
      ORDER BY hl.created_at DESC
      LIMIT 12
    `),
  ]);

  // ── Condition counts ──────────────────────────────────────
  const conditionCounts = { GOOD: 0, FAIR: 0, POOR: 0, UNINSPECTED: 0 };
  for (const row of condRows) {
    conditionCounts[row.status] = Number(row.cnt);
  }

  // ── Inspection trend — last 6 calendar months ─────────────
  const now      = new Date();
  const trendMap = {};
  for (const r of trendRows) {
    trendMap[`${r.yr}-${r.mo}`] = Number(r.cnt);
  }
  const inspectionTrend = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return {
      month: MONTHS[d.getMonth()],
      count: trendMap[`${d.getFullYear()}-${d.getMonth() + 1}`] ?? 0,
    };
  });

  // ── Poor bridges ──────────────────────────────────────────
  const poorBridges = poorRows.map(r => ({
    id:            r.id,
    serialNumber:  r.serial_number,
    structureType: r.structure_type,
    section:       r.section,
    chainage:      r.chainage,
    inspections: r.li_id ? [{
      id:                r.li_id,
      inspectorName:     r.li_inspector_name,
      inspectionDate:    toISO(r.li_inspection_date),
      conditionStatus:   r.li_condition_status,
      defectDescription: r.li_defect_description,
    }] : [],
  }));

  // ── Recent inspections ────────────────────────────────────
  const recentInspections = recentInsRows.map(r => ({
    id:             r.id,
    bridgeId:       r.bridge_id,
    inspectorName:  r.inspector_name,
    inspectionDate: toISO(r.inspection_date),
    conditionStatus: r.condition_status,
    isResolved:     Boolean(r.is_resolved),
    bridge: r.b_serial ? {
      serialNumber:  r.b_serial,
      bridgeName:    r.b_name ?? null,
      section:       r.b_section,
      structureType: r.b_structure ?? null,
      chainage:      r.b_chainage ?? null,
    } : null,
  }));

  // ── Recent activity ───────────────────────────────────────
  const recentActivity = activityRows.map(r => ({
    id:         r.id,
    bridgeId:   r.bridge_id,
    userId:     r.user_id,
    actionType: r.action_type,
    oldValues:  typeof r.old_values === 'string' ? JSON.parse(r.old_values) : (r.old_values ?? {}),
    newValues:  typeof r.new_values === 'string' ? JSON.parse(r.new_values) : (r.new_values ?? {}),
    createdAt:  toISO(r.created_at),
    user:   r.u_fn     ? { id: r.user_id, firstName: r.u_fn, lastName: r.u_ln } : null,
    bridge: r.b_serial ? { serialNumber: r.b_serial, section: r.b_section }     : null,
  }));

  // ── Second wave: quarter throughput, overdue, sub-modules ──
  const [
    [[{ inspectionsThisQuarter }]],
    [[{ bridgesInspectedThisQuarter }]],
    [[{ inspectionsLastQuarter }]],
    [[{ overdueInspections }]],
    maintenance,
    sensors,
  ] = await Promise.all([

    pool.query(`
      SELECT COUNT(*) AS inspectionsThisQuarter
      FROM inspections
      WHERE YEAR(inspection_date)    = YEAR(CURDATE())
        AND QUARTER(inspection_date) = QUARTER(CURDATE())
    `),

    pool.query(`
      SELECT COUNT(DISTINCT bridge_id) AS bridgesInspectedThisQuarter
      FROM inspections
      WHERE YEAR(inspection_date)    = YEAR(CURDATE())
        AND QUARTER(inspection_date) = QUARTER(CURDATE())
    `),

    pool.query(`
      SELECT COUNT(*) AS inspectionsLastQuarter
      FROM inspections
      WHERE YEAR(inspection_date)    = YEAR(DATE_SUB(CURDATE(), INTERVAL 1 QUARTER))
        AND QUARTER(inspection_date) = QUARTER(DATE_SUB(CURDATE(), INTERVAL 1 QUARTER))
    `),

    // Never inspected, or last inspected beyond the reminder threshold
    pool.query(`
      SELECT COUNT(*) AS overdueInspections
      FROM bridges b
      ${LATEST_INS_JOIN}
      WHERE li.inspection_date IS NULL
         OR li.inspection_date < DATE_SUB(NOW(), INTERVAL ${OVERDUE_MONTHS} MONTH)
    `),

    optional(getMaintenanceSummary, EMPTY_MAINTENANCE, 'maintenance summary'),
    optional(getSensorSummary,      EMPTY_SENSORS,     'sensor summary'),
  ]);

  /* Critical alert roll-up.
     Deliberately excludes `unresolvedDefects` from the total: those rows
     overlap almost completely with POOR-condition structures and would
     double-count the same physical problem. The breakdown is returned so
     the UI can show what the number is made of. */
  const criticalAlerts = {
    poorCondition:        conditionCounts.POOR ?? 0,
    overdueInspections:   Number(overdueInspections),
    emergencyMaintenance: maintenance.emergencyOpen ?? 0,
    sensorAlarms:         sensors.byStatus?.ALARM ?? 0,
    unresolvedDefects:    Number(unresolvedDefects),
  };
  criticalAlerts.total =
    criticalAlerts.poorCondition +
    criticalAlerts.overdueInspections +
    criticalAlerts.emergencyMaintenance +
    criticalAlerts.sensorAlarms;

  const inspectedCount = (conditionCounts.GOOD ?? 0) + (conditionCounts.FAIR ?? 0) + (conditionCounts.POOR ?? 0);

  return {
    // ── existing contract — unchanged ──
    totalBridges:          Number(totalBridges),
    recentlyInspected:     Number(recentlyInspected),
    unresolvedDefects:     Number(unresolvedDefects),
    withUnresolvedDefects: Number(withUnresolvedDefects),
    conditionCounts,
    recentActivity,
    inspectionTrend,
    poorBridges,
    recentInspections,

    // ── added for the monitoring dashboard ──
    healthIndex:  computeHealthIndex(conditionCounts),
    healthWeights: HEALTH_WEIGHTS,
    coverage: {
      inspected: inspectedCount,
      total:     Number(totalBridges),
      pct:       Number(totalBridges) > 0 ? Math.round((inspectedCount / Number(totalBridges)) * 100) : 0,
    },
    quarter: {
      inspections:      Number(inspectionsThisQuarter),
      bridgesInspected: Number(bridgesInspectedThisQuarter),
      previous:         Number(inspectionsLastQuarter),
      delta:            Number(inspectionsThisQuarter) - Number(inspectionsLastQuarter),
    },
    overdueInspections: Number(overdueInspections),
    criticalAlerts,
    maintenance,
    sensors,
    generatedAt: new Date().toISOString(),
  };
};
