-- ══════════════════════════════════════════════════════════════════
--  MIGRATION 001 — Sensor / IoT telemetry
--
--  Adds structural monitoring hardware (sensor_devices) and their
--  time-series measurements (sensor_readings).
--
--  SAFE TO RE-RUN: every statement is guarded with IF NOT EXISTS.
--  This migration only ADDS tables. It does not alter or drop any
--  existing table, and does not touch existing rows.
--
--  Apply with:
--      mysql -u <user> -p <database> < 001_sensor_telemetry.sql
--
--  Verify with:
--      SHOW TABLES LIKE 'sensor_%';
--      SELECT COUNT(*) FROM sensor_devices;
-- ══════════════════════════════════════════════════════════════════

-- ── Monitoring hardware installed on a structure ──────────────────
CREATE TABLE IF NOT EXISTS sensor_devices (
  id              INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  bridge_id       INT UNSIGNED  NOT NULL,
  device_code     VARCHAR(60)   NOT NULL
                  COMMENT 'Field identifier stencilled on the device, e.g. TLT-BRG003-P4',
  sensor_type     ENUM('TILT','VIBRATION','STRAIN','DISPLACEMENT',
                       'TEMPERATURE','WATER_LEVEL','CRACK_WIDTH') NOT NULL,
  unit            VARCHAR(20)   DEFAULT NULL
                  COMMENT 'Engineering unit of the reading, e.g. mm, mm/s, deg, C',
  location_note   VARCHAR(255)  DEFAULT NULL
                  COMMENT 'Where on the structure, e.g. Pier 4 bearing, mid-span soffit',
  warn_threshold  DECIMAL(12,4) DEFAULT NULL
                  COMMENT 'Absolute magnitude at/above which a reading is WARN',
  alarm_threshold DECIMAL(12,4) DEFAULT NULL
                  COMMENT 'Absolute magnitude at/above which a reading is ALARM',
  is_active       TINYINT(1)    NOT NULL DEFAULT 1,
  installed_at    DATE          DEFAULT NULL,
  last_seen_at    DATETIME      DEFAULT NULL
                  COMMENT 'Updated on every accepted reading — drives the stale-device check',
  created_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_sensor_device_code (device_code),
  KEY        idx_sensor_bridge      (bridge_id),
  KEY        idx_sensor_type        (sensor_type),
  KEY        idx_sensor_active      (is_active),
  CONSTRAINT fk_sensor_bridge FOREIGN KEY (bridge_id)
             REFERENCES bridges(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Structural monitoring devices attached to bridges';

-- ── Time-series measurements ──────────────────────────────────────
--  BIGINT primary key: this is the only table in the system expected
--  to exceed the ~4.29 billion row ceiling of INT UNSIGNED. One device
--  sampling every 5 minutes produces ~105k rows/year; a few hundred
--  devices at higher rates reaches INT's limit within the asset's life.
CREATE TABLE IF NOT EXISTS sensor_readings (
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  device_id      INT UNSIGNED    NOT NULL,
  reading_value  DECIMAL(12,4)   NOT NULL,
  status         ENUM('OK','WARN','ALARM') NOT NULL DEFAULT 'OK'
                 COMMENT 'Classified at write time against the device thresholds',
  recorded_at    DATETIME        NOT NULL
                 COMMENT 'Time reported by the device, not time of insert',
  created_at     TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  -- Composite index drives the only hot read path: latest-N for one device.
  KEY idx_reading_device_time (device_id, recorded_at DESC),
  -- Supports the fleet-wide 24h volume count and any retention pruning job.
  KEY idx_reading_time        (recorded_at DESC),
  -- Partial-ish scan support for "show me everything currently breached".
  KEY idx_reading_status_time (status, recorded_at DESC),
  CONSTRAINT fk_reading_device FOREIGN KEY (device_id)
             REFERENCES sensor_devices(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Raw sensor telemetry — high volume, append only';


-- ══════════════════════════════════════════════════════════════════
--  RETENTION (recommended, not enabled here)
--
--  sensor_readings grows without bound. Before connecting real
--  hardware, choose one of:
--
--    a) Scheduled prune — keep raw data for 90 days:
--         DELETE FROM sensor_readings
--         WHERE recorded_at < DATE_SUB(NOW(), INTERVAL 90 DAY)
--         LIMIT 10000;              -- run in a loop, not one statement
--
--    b) Roll-up table — aggregate to hourly min/max/avg per device and
--       prune raw rows after roll-up (preferred for trend charts).
--
--  Do NOT enable an unbounded DELETE in a single transaction on a
--  large table: it will lock and blow out the InnoDB undo log.
-- ══════════════════════════════════════════════════════════════════
