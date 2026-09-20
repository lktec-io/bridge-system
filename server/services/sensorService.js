import pool from '../config/database.js';
import { createNotification } from './notificationService.js';

const toISO = (v) => v ? (v instanceof Date ? v.toISOString() : new Date(v).toISOString()) : null;
const num   = (v) => (v === null || v === undefined ? null : Number(v));

export const SENSOR_TYPES = [
  'TILT', 'VIBRATION', 'STRAIN', 'DISPLACEMENT', 'TEMPERATURE', 'WATER_LEVEL', 'CRACK_WIDTH',
];

/* A device is stale when it has not reported inside this window. */
const STALE_MINUTES = 180;

/**
 * Classify a reading against the device's configured thresholds.
 * Thresholds are absolute-value based: telemetry can swing negative
 * (tilt, displacement) and the magnitude is what matters structurally.
 */
export function classifyReading(value, warnThreshold, alarmThreshold) {
  const v = Math.abs(Number(value));
  if (alarmThreshold !== null && alarmThreshold !== undefined && v >= Math.abs(Number(alarmThreshold))) return 'ALARM';
  if (warnThreshold  !== null && warnThreshold  !== undefined && v >= Math.abs(Number(warnThreshold)))  return 'WARN';
  return 'OK';
}

function mapDevice(r) {
  return {
    id:             r.id,
    bridgeId:       r.bridge_id,
    deviceCode:     r.device_code,
    sensorType:     r.sensor_type,
    unit:           r.unit,
    location:       r.location_note,
    warnThreshold:  num(r.warn_threshold),
    alarmThreshold: num(r.alarm_threshold),
    isActive:       Boolean(r.is_active),
    installedAt:    toISO(r.installed_at),
    lastSeenAt:     toISO(r.last_seen_at),
    createdAt:      toISO(r.created_at),
    bridge: r.b_serial ? { serialNumber: r.b_serial, section: r.b_section } : null,
    latest: r.latest_value === null || r.latest_value === undefined ? null : {
      value:      Number(r.latest_value),
      status:     r.latest_status,
      recordedAt: toISO(r.latest_recorded_at),
    },
    stale: r.last_seen_at
      ? (Date.now() - new Date(r.last_seen_at).getTime()) > STALE_MINUTES * 60_000
      : true,
  };
}

const DEVICE_SELECT = `
  SELECT d.id, d.bridge_id, d.device_code, d.sensor_type, d.unit, d.location_note,
         d.warn_threshold, d.alarm_threshold, d.is_active, d.installed_at,
         d.last_seen_at, d.created_at,
         b.serial_number AS b_serial, b.section AS b_section,
         lr.reading_value AS latest_value,
         lr.status        AS latest_status,
         lr.recorded_at   AS latest_recorded_at
  FROM sensor_devices d
  LEFT JOIN bridges b ON b.id = d.bridge_id
  LEFT JOIN sensor_readings lr ON lr.id = (
    SELECT id FROM sensor_readings
    WHERE device_id = d.id
    ORDER BY recorded_at DESC, id DESC
    LIMIT 1
  )
`;

// ── devices ───────────────────────────────────────────────────
export const listDevices = async ({ bridgeId, sensorType, status } = {}) => {
  const where  = [];
  const params = [];

  if (bridgeId)   { where.push('d.bridge_id = ?');   params.push(Number(bridgeId)); }
  if (sensorType) { where.push('d.sensor_type = ?'); params.push(String(sensorType).toUpperCase()); }
  if (status)     { where.push('lr.status = ?');     params.push(String(status).toUpperCase()); }

  const whereSQL = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const [rows] = await pool.query(
    `${DEVICE_SELECT} ${whereSQL} ORDER BY d.device_code ASC`,
    params
  );
  return rows.map(mapDevice);
};

export const getDeviceByCode = async (code) => {
  const [rows] = await pool.query(
    'SELECT * FROM sensor_devices WHERE device_code = ?',
    [String(code)]
  );
  return rows.length ? rows[0] : null;
};

export const createDevice = async (data) => {
  const type = SENSOR_TYPES.includes(String(data.sensorType).toUpperCase())
    ? String(data.sensorType).toUpperCase() : 'VIBRATION';

  const [result] = await pool.query(
    `INSERT INTO sensor_devices
       (bridge_id, device_code, sensor_type, unit, location_note,
        warn_threshold, alarm_threshold, is_active, installed_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      Number(data.bridgeId),
      String(data.deviceCode).trim(),
      type,
      data.unit ?? null,
      data.location ?? null,
      data.warnThreshold  === '' || data.warnThreshold  == null ? null : Number(data.warnThreshold),
      data.alarmThreshold === '' || data.alarmThreshold == null ? null : Number(data.alarmThreshold),
      data.isActive === false ? 0 : 1,
      data.installedAt ? new Date(data.installedAt) : null,
    ]
  );

  const [rows] = await pool.query(`${DEVICE_SELECT} WHERE d.id = ?`, [result.insertId]);
  return rows.length ? mapDevice(rows[0]) : null;
};

export const deleteDevice = async (id) => {
  const [rows] = await pool.query('SELECT id FROM sensor_devices WHERE id = ?', [id]);
  if (!rows.length) return false;
  await pool.query('DELETE FROM sensor_devices WHERE id = ?', [id]);
  return true;
};

// ── readings ──────────────────────────────────────────────────
/**
 * Readings are returned newest-last so charts can render left→right.
 * `hours` is clamped: an unbounded window on a high-frequency stream
 * is the fastest way to blow up both MySQL and the JSON payload.
 */
export const getDeviceReadings = async (deviceId, { hours = 24, limit = 500 } = {}) => {
  const win = Math.min(Math.max(Number(hours) || 24, 1), 720);   // 1h … 30d
  const cap = Math.min(Math.max(Number(limit) || 500, 1), 2000);

  const [rows] = await pool.query(
    `SELECT id, device_id, reading_value, status, recorded_at
     FROM sensor_readings
     WHERE device_id = ?
       AND recorded_at >= DATE_SUB(NOW(), INTERVAL ? HOUR)
     ORDER BY recorded_at DESC, id DESC
     LIMIT ?`,
    [Number(deviceId), win, cap]
  );

  return rows
    .map(r => ({
      id:         r.id,
      deviceId:   r.device_id,
      value:      Number(r.reading_value),
      status:     r.status,
      recordedAt: toISO(r.recorded_at),
    }))
    .reverse();
};

/**
 * Ingest a single reading for a device identified by its code.
 * Returns null when the device code is unknown so the caller can 404.
 * An ALARM transition raises one notification — WARN does not, to keep
 * the signal list usable when a stream sits just above the warn line.
 */
export const ingestReading = async ({ deviceCode, value, recordedAt }) => {
  const device = await getDeviceByCode(deviceCode);
  if (!device) return null;

  const status = classifyReading(value, device.warn_threshold, device.alarm_threshold);
  const when   = recordedAt ? new Date(recordedAt) : new Date();

  const [result] = await pool.query(
    `INSERT INTO sensor_readings (device_id, reading_value, status, recorded_at)
     VALUES (?, ?, ?, ?)`,
    [device.id, Number(value), status, when]
  );

  await pool.query('UPDATE sensor_devices SET last_seen_at = ? WHERE id = ?', [when, device.id]);

  if (status === 'ALARM') {
    const [prev] = await pool.query(
      `SELECT status FROM sensor_readings
       WHERE device_id = ? AND id <> ?
       ORDER BY recorded_at DESC, id DESC
       LIMIT 1`,
      [device.id, result.insertId]
    );
    // Only announce the crossing, not every sample while it stays breached.
    if (!prev.length || prev[0].status !== 'ALARM') {
      const [b] = await pool.query('SELECT serial_number FROM bridges WHERE id = ?', [device.bridge_id]);
      const serial = b.length ? b[0].serial_number : `Bridge #${device.bridge_id}`;
      createNotification(
        'SENSOR_THRESHOLD',
        'Sensor threshold breached',
        `${device.device_code} on ${serial} reported ${Number(value)}${device.unit ? ` ${device.unit}` : ''} — alarm threshold exceeded`,
        'bridge',
        device.bridge_id
      ).catch(() => {});
    }
  }

  return {
    id:         result.insertId,
    deviceId:   device.id,
    deviceCode: device.device_code,
    value:      Number(value),
    status,
    recordedAt: toISO(when),
  };
};

// ── summary (dashboard + analytics page) ──────────────────────
export const getSensorSummary = async () => {
  const [[[{ deviceCount }]], [[{ activeCount }]], [[{ bridgesMonitored }]], [statusRows], [[{ readings24h }]]] =
    await Promise.all([
      pool.query('SELECT COUNT(*) AS deviceCount FROM sensor_devices'),
      pool.query('SELECT COUNT(*) AS activeCount FROM sensor_devices WHERE is_active = 1'),
      pool.query('SELECT COUNT(DISTINCT bridge_id) AS bridgesMonitored FROM sensor_devices'),
      pool.query(`
        SELECT lr.status, COUNT(*) AS cnt
        FROM sensor_devices d
        JOIN sensor_readings lr ON lr.id = (
          SELECT id FROM sensor_readings
          WHERE device_id = d.id
          ORDER BY recorded_at DESC, id DESC
          LIMIT 1
        )
        GROUP BY lr.status
      `),
      pool.query(`
        SELECT COUNT(*) AS readings24h
        FROM sensor_readings
        WHERE recorded_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
      `),
    ]);

  const byStatus = { OK: 0, WARN: 0, ALARM: 0 };
  for (const r of statusRows) byStatus[r.status] = Number(r.cnt);

  return {
    deviceCount:      Number(deviceCount),
    activeCount:      Number(activeCount),
    bridgesMonitored: Number(bridgesMonitored),
    byStatus,
    readings24h:      Number(readings24h),
    instrumented:     Number(deviceCount) > 0,
  };
};
