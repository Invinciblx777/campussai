-- ============================================================
--  SafetyHub — Supabase Schema
-- ============================================================
--  Run this in the Supabase SQL Editor:
--    Dashboard → SQL Editor → New Query → paste → Run
-- ============================================================

-- Sensor data table
CREATE TABLE IF NOT EXISTS sensor_data (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  device_id   TEXT NOT NULL,
  temperature REAL,
  humidity    REAL,
  gas_level   INTEGER,
  vibration   REAL,
  alert       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Index for querying latest readings per device
CREATE INDEX IF NOT EXISTS idx_sensor_data_device
  ON sensor_data (device_id, created_at DESC);

-- Index for time-range queries (analytics dashboard)
CREATE INDEX IF NOT EXISTS idx_sensor_data_time
  ON sensor_data (created_at DESC);

-- Enable Row Level Security (optional — disable if using service role key)
-- ALTER TABLE sensor_data ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts (for the gateway using anon key)
-- CREATE POLICY "Allow anonymous inserts"
--   ON sensor_data FOR INSERT
--   TO anon
--   WITH CHECK (true);

-- Allow anonymous reads (for the web dashboard)
-- CREATE POLICY "Allow anonymous reads"
--   ON sensor_data FOR SELECT
--   TO anon
--   USING (true);

-- ============================================================
--  Verify: after running, check Table Editor for sensor_data
-- ============================================================
