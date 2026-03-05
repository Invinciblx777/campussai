/**
 * ============================================================
 *  SafetyHub Node.js Gateway Server
 * ============================================================
 *
 *  Receives sensor data from ESP32 via HTTP POST and forwards
 *  it to Supabase cloud database. Runs on the Windows laptop
 *  that bridges ESP32 WiFi and internet (USB tethering).
 *
 *  Endpoints:
 *    POST /sensor-data   → receive + validate + store in Supabase
 *    GET  /sensor-data   → latest buffered readings
 *    GET  /health        → gateway + Supabase status
 *
 *  Features:
 *    - Request validation with descriptive errors
 *    - Supabase insert with retry (exponential backoff)
 *    - Offline buffer (flush when Supabase reconnects)
 *    - Rate limiting (configurable)
 *    - Structured logging (Winston)
 *    - Graceful shutdown (SIGINT / SIGTERM)
 *    - CORS enabled for dashboard access
 * ============================================================
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { createClient } from '@supabase/supabase-js';
import winston from 'winston';

// ── Configuration ───────────────────────────────────────────
const CONFIG = {
  port: parseInt(process.env.PORT || '3000', 10),
  host: process.env.HOST || '0.0.0.0',
  logLevel: process.env.LOG_LEVEL || 'info',
  supabaseUrl: process.env.SUPABASE_URL || '',
  supabaseKey: process.env.SUPABASE_KEY || '',
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '60', 10),
  rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
  bufferMaxSize: parseInt(process.env.BUFFER_MAX_SIZE || '500', 10),
  retryAttempts: 3,
  retryBaseDelay: 1000,  // ms — exponential backoff base
};

// ── Logger (Winston) ────────────────────────────────────────
const logger = winston.createLogger({
  level: CONFIG.logLevel,
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      const metaStr = Object.keys(meta).length ? ' ' + JSON.stringify(meta) : '';
      return `${timestamp}  ${level.toUpperCase().padEnd(7)}  ${message}${metaStr}`;
    })
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({
      filename: 'gateway.log',
      maxsize: 5 * 1024 * 1024,  // 5 MB
      maxFiles: 3,
    }),
  ],
});

// ── Supabase Client ─────────────────────────────────────────
let supabase = null;
let supabaseOnline = false;

if (CONFIG.supabaseUrl && CONFIG.supabaseKey &&
  !CONFIG.supabaseUrl.includes('your-project')) {
  supabase = createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey);
  logger.info('Supabase client initialized', { url: CONFIG.supabaseUrl });
} else {
  logger.warn('Supabase credentials not configured — data will be buffered locally only');
}

// ── State ───────────────────────────────────────────────────
const state = {
  latestReading: null,
  recentReadings: [],       // last 100 readings
  offlineBuffer: [],       // readings waiting to be flushed to Supabase
  stats: {
    totalReceived: 0,
    totalInserted: 0,
    totalFailed: 0,
    bufferFlushes: 0,
    startedAt: new Date().toISOString(),
  },
};

const MAX_RECENT = 100;

// ── Express App ─────────────────────────────────────────────
const app = express();

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
}));

app.use(express.json({ limit: '10kb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: CONFIG.rateLimitWindow,
  max: CONFIG.rateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests', retryAfterMs: CONFIG.rateLimitWindow },
});
app.use(limiter);

// ── Request Validation ──────────────────────────────────────
function validateSensorPayload(body) {
  const errors = [];

  if (!body || typeof body !== 'object') {
    return ['Request body must be a JSON object'];
  }

  // device_id: required string
  if (!body.device_id || typeof body.device_id !== 'string') {
    errors.push('device_id is required and must be a string');
  }

  // temperature: required number
  if (body.temperature === undefined || typeof body.temperature !== 'number') {
    errors.push('temperature is required and must be a number');
  } else if (body.temperature < -50 || body.temperature > 100) {
    errors.push('temperature must be between -50 and 100');
  }

  // humidity: required number
  if (body.humidity === undefined || typeof body.humidity !== 'number') {
    errors.push('humidity is required and must be a number');
  } else if (body.humidity < 0 || body.humidity > 100) {
    errors.push('humidity must be between 0 and 100');
  }

  // gasLevel: optional number
  if (body.gasLevel !== undefined && typeof body.gasLevel !== 'number') {
    errors.push('gasLevel must be a number if provided');
  }

  // vibration: optional number
  if (body.vibration !== undefined && typeof body.vibration !== 'number') {
    errors.push('vibration must be a number if provided');
  }

  return errors;
}

// ── Supabase Insert with Retry ──────────────────────────────
async function insertToSupabase(reading) {
  if (!supabase) return false;

  for (let attempt = 1; attempt <= CONFIG.retryAttempts; attempt++) {
    try {
      const { data, error } = await supabase
        .from('sensor_data')
        .insert({
          device_id: reading.device_id,
          temperature: reading.temperature,
          humidity: reading.humidity,
          gas_level: reading.gasLevel ?? null,
          vibration: reading.vibration ?? null,
          alert: reading.alert ?? null,
        })
        .select('id')
        .single();

      if (error) {
        throw new Error(`Supabase error: ${error.message}`);
      }

      supabaseOnline = true;
      state.stats.totalInserted++;
      logger.debug('Supabase INSERT OK', { id: data.id, device: reading.device_id });
      return true;

    } catch (err) {
      const delay = CONFIG.retryBaseDelay * Math.pow(2, attempt - 1);
      logger.warn(`Supabase INSERT failed (attempt ${attempt}/${CONFIG.retryAttempts})`, {
        error: err.message,
        retryIn: `${delay}ms`,
      });

      if (attempt < CONFIG.retryAttempts) {
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }

  // All retries exhausted
  supabaseOnline = false;
  state.stats.totalFailed++;
  return false;
}

// ── Offline Buffer Flush ────────────────────────────────────
let flushInProgress = false;

async function flushBuffer() {
  if (flushInProgress || state.offlineBuffer.length === 0 || !supabase) return;
  flushInProgress = true;

  logger.info(`Flushing offline buffer (${state.offlineBuffer.length} readings)...`);

  const toFlush = [...state.offlineBuffer];
  let flushed = 0;

  for (const reading of toFlush) {
    const success = await insertToSupabase(reading);
    if (success) {
      flushed++;
      // Remove from buffer
      const idx = state.offlineBuffer.indexOf(reading);
      if (idx > -1) state.offlineBuffer.splice(idx, 1);
    } else {
      // Supabase still down — stop trying
      logger.warn('Buffer flush interrupted — Supabase still unreachable');
      break;
    }
  }

  if (flushed > 0) {
    state.stats.bufferFlushes++;
    logger.info(`Buffer flush complete: ${flushed}/${toFlush.length} readings sent`);
  }

  flushInProgress = false;
}

// Periodically try to flush the buffer (every 30s)
setInterval(flushBuffer, 30000);

// ── Routes ──────────────────────────────────────────────────

// POST /sensor-data  — receive sensor data from ESP32
app.post('/sensor-data', async (req, res) => {
  try {
    const validationErrors = validateSensorPayload(req.body);
    if (validationErrors.length > 0) {
      logger.warn('Invalid sensor payload', { errors: validationErrors, ip: req.ip });
      return res.status(400).json({
        error: 'Validation failed',
        details: validationErrors,
      });
    }

    const reading = {
      device_id: req.body.device_id,
      temperature: req.body.temperature,
      humidity: req.body.humidity,
      gasLevel: req.body.gasLevel ?? null,
      vibration: req.body.vibration ?? null,
      alert: req.body.alert ?? null,
      receivedAt: new Date().toISOString(),
    };

    state.stats.totalReceived += 1;
    state.latestReading = reading;

    // Keep recent readings in memory
    state.recentReadings.push(reading);
    if (state.recentReadings.length > MAX_RECENT) {
      state.recentReadings.shift();
    }

    logger.info('Sensor data received', {
      device: reading.device_id,
      temp: reading.temperature,
      hum: reading.humidity,
      gas: reading.gasLevel,
      vib: reading.vibration,
      alert: reading.alert,
    });

    // Try to insert into Supabase
    let supabaseResult = 'not_configured';
    if (supabase) {
      const success = await insertToSupabase(reading);
      if (success) {
        supabaseResult = 'inserted';
      } else {
        supabaseResult = 'buffered';
        if (state.offlineBuffer.length < CONFIG.bufferMaxSize) {
          state.offlineBuffer.push(reading);
          logger.info('Reading buffered for later flush', {
            bufferSize: state.offlineBuffer.length,
          });
        } else {
          logger.error('Offline buffer full — dropping reading', {
            maxSize: CONFIG.bufferMaxSize,
          });
        }
      }
    }

    return res.status(200).json({
      status: 'ok',
      supabase: supabaseResult,
      bufferSize: state.offlineBuffer.length,
    });
  } catch (err) {
    logger.error('POST /sensor-data error', { error: err.message, stack: err.stack });
    return res.status(500).json({ error: 'Internal server error', detail: err.message });
  }
});

// GET /sensor-data  — latest readings for debugging
app.get('/sensor-data', (req, res) => {
  if (!state.latestReading) {
    return res.status(204).json({ message: 'No data received yet' });
  }

  const limit = Math.min(parseInt(req.query.limit || '10', 10), MAX_RECENT);
  res.json({
    latest: state.latestReading,
    recent: state.recentReadings.slice(-limit),
    count: state.recentReadings.length,
  });
});

// GET /health  — gateway + Supabase health
app.get('/health', async (req, res) => {
  let supabaseStatus = 'not_configured';
  if (supabase) {
    // Quick connectivity check
    try {
      const { error } = await supabase
        .from('sensor_data')
        .select('id')
        .limit(1);
      supabaseStatus = error ? `error: ${error.message}` : 'online';
      supabaseOnline = !error;
    } catch (e) {
      supabaseStatus = `error: ${e.message}`;
      supabaseOnline = false;
    }
  }

  res.json({
    gateway: 'online',
    supabase: supabaseStatus,
    uptime: process.uptime().toFixed(0) + 's',
    stats: state.stats,
    bufferSize: state.offlineBuffer.length,
    bufferMaxSize: CONFIG.bufferMaxSize,
    latestReading: state.latestReading ? state.latestReading.receivedAt : null,
    recentCount: state.recentReadings.length,
  });
});

// 404 fallback
app.use((req, res) => {
  res.status(404).json({ error: 'Not found', path: req.path });
});

// Global error handler (must have exactly 4 params for Express to recognize it)
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  logger.error('Unhandled error', { error: err.message, stack: err.stack });
  res.status(500).json({ error: 'Internal server error' });
});

// ── Start Server ────────────────────────────────────────────
const server = app.listen(CONFIG.port, CONFIG.host, () => {
  logger.info(`SafetyHub Gateway running on http://${CONFIG.host}:${CONFIG.port}`);
  logger.info('Endpoints:');
  logger.info('  POST /sensor-data   — receive ESP32 data');
  logger.info('  GET  /sensor-data   — latest readings');
  logger.info('  GET  /health        — gateway status');
  logger.info(`Supabase: ${supabase ? 'configured' : 'NOT configured (data buffered only)'}`);
});

// ── Graceful Shutdown ───────────────────────────────────────
async function gracefulShutdown(signal) {
  logger.info(`${signal} received — shutting down gracefully...`);

  // Flush buffer before exit
  if (state.offlineBuffer.length > 0 && supabase) {
    logger.info(`Flushing ${state.offlineBuffer.length} buffered readings before exit...`);
    await flushBuffer();
  }

  server.close(() => {
    logger.info('HTTP server closed');
    logger.info('Final stats', state.stats);
    process.exit(0);
  });

  // Force exit after 10s
  setTimeout(() => {
    logger.error('Forced exit after timeout');
    process.exit(1);
  }, 10000);
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Windows-specific: handle Ctrl+C properly
if (process.platform === 'win32') {
  import('readline').then((readline) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.on('SIGINT', () => gracefulShutdown('SIGINT'));
  });
}

export default app;
