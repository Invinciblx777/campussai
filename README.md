# SafetyHub — Campus Emergency & Multi-Hazard Alert System

## System Architecture

```
ESP32 DevKit V1 (WiFi Access Point)
  ├── MPU6050 (vibration/seismic)
  ├── MQ2     (gas sensor)
  └── DHT11   (temperature + humidity)
        │
        │  WiFi AP  (SSID: SafetyHub)
        ▼
  ┌────────────────────────────────────────────┐
  │  Windows 11 Laptop (Gateway)               │
  │                                            │
  │  WiFi adapter → ESP32 network (192.168.4.x)│
  │  USB tethering → internet via Android      │
  │                                            │
  │  Node.js Gateway (port 3000)               │
  │    POST /sensor-data ← ESP32 pushes data   │
  │    ↓ validates + logs + buffers            │
  │    ↓ inserts into Supabase                 │
  │                                            │
  │  React Dashboard (port 5173)               │
  │    reads from Supabase OR ESP32 direct     │
  └────────────────────────────────────────────┘
        │
        │  USB tethering (internet)
        ▼
  Supabase Cloud Database
    table: sensor_data
```

### Data Flow

1. **ESP32** reads sensors every 500ms, runs WiFi AP
2. **ESP32** POSTs JSON to `http://192.168.4.2:3000/sensor-data` every 5s
3. **Node.js Gateway** validates, logs, and inserts into Supabase
4. If Supabase is unreachable, data is buffered in memory (up to 500 readings)
5. Buffer flushes automatically when Supabase reconnects
6. **React Dashboard** reads from Supabase (or ESP32 direct as fallback)

---

## Quick Start

### 1. Flash ESP32

1. Open `esp32/SafetyHub.ino` in Arduino IDE
2. Install libraries: DHT sensor library (Adafruit), Adafruit Unified Sensor
3. Select board: **ESP32 Dev Module**, upload speed 115200
4. Flash and open Serial Monitor at 115200 baud

Expected output:
```
[SafetyHub] MPU6050 OK
[SafetyHub] DHT11 OK
[SafetyHub] MQ2 OK
[SafetyHub] AP started  SSID: SafetyHub  IP: 192.168.4.1
[SafetyHub] Gateway target: http://192.168.4.2:3000/sensor-data
[SafetyHub] Ready.  Push mode ENABLED — POST every 5s
```

### 2. Setup Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Go to SQL Editor and run `supabase/schema.sql`
3. Copy your project URL and anon key from Settings → API

### 3. Setup Network (Windows 11)

Connect laptop to **SafetyHub** WiFi (password: `safetyhub123`) and enable USB tethering on Android:

```powershell
# Run as Administrator
powershell -ExecutionPolicy Bypass -File scripts\setup-network.ps1
powershell -ExecutionPolicy Bypass -File scripts\setup-firewall.ps1
```

### 4. Start Node.js Gateway

```bash
cd gateway-node
cp .env.example .env
# Edit .env with your Supabase URL and key
npm install
npm start
```

### 5. Start Dashboard

```bash
npm install
npm run dev
```

Open: **http://localhost:5173**

---

## ESP32 Setup

### Arduino IDE Libraries

| Library | Version |
|---|---|
| DHT sensor library (Adafruit) | ≥ 1.4.4 |
| Adafruit Unified Sensor | ≥ 1.1.9 |

> **MPU6050**: Uses raw I2C register reads — no external library needed.

### Board Settings

- Board: **ESP32 Dev Module**
- Upload Speed: 115200
- CPU Frequency: 240 MHz
- Partition Scheme: Default 4MB with spiffs

### Wiring

```
ESP32 Pin   →  Sensor
─────────────────────────────────
GPIO 21     →  MPU6050 SDA
GPIO 22     →  MPU6050 SCL
3.3V        →  MPU6050 VCC
GND         →  MPU6050 GND

GPIO 4      →  DHT11 DATA
3.3V        →  DHT11 VCC
GND         →  DHT11 GND
(10kΩ pull-up between DATA and VCC)

GPIO 34     →  MQ2 AOUT (analog)
5V          →  MQ2 VCC  (MQ2 heater needs 5V)
GND         →  MQ2 GND
```

> ⚠ GPIO 34 is input-only ADC1 — required because ADC2 pins conflict with WiFi.

### ESP32 Configuration

To change the gateway IP (if your laptop gets a different IP from DHCP):

```cpp
const char* GATEWAY_IP   = "192.168.4.2";  // Change this
const int   GATEWAY_PORT = 3000;
```

---

## Node.js Gateway

### Endpoints

| Method | Path | Description |
|---|---|---|
| POST | `/sensor-data` | Receive ESP32 sensor data |
| GET | `/sensor-data` | Latest buffered readings |
| GET | `/health` | Gateway + Supabase status |

### Environment Variables

| Variable | Default | Description |
|---|---|---|
| `SUPABASE_URL` | — | Supabase project URL |
| `SUPABASE_KEY` | — | Supabase anon or service role key |
| `PORT` | 3000 | Server port |
| `HOST` | 0.0.0.0 | Bind address |
| `LOG_LEVEL` | info | Winston log level |
| `RATE_LIMIT_MAX` | 60 | Max requests/minute/IP |
| `BUFFER_MAX_SIZE` | 500 | Max buffered readings when Supabase is offline |

### Features

- **Validation**: Rejects payloads missing `device_id`, `temperature`, or `humidity`
- **Retry**: 3 attempts with exponential backoff for Supabase inserts
- **Buffer**: Stores readings in memory when Supabase is unreachable; flushes every 30s
- **Rate Limiting**: 60 requests/minute per IP (configurable)
- **Logging**: Winston with console + file output (`gateway.log`)
- **Graceful Shutdown**: Flushes buffer on SIGINT/SIGTERM

---

## Supabase Schema

```sql
CREATE TABLE sensor_data (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  device_id   TEXT NOT NULL,
  temperature REAL,
  humidity    REAL,
  gas_level   INTEGER,
  vibration   REAL,
  alert       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

Run the full schema from `supabase/schema.sql` in Supabase SQL Editor.

---

## Network Configuration

### Dual-NIC Setup

The laptop uses **two network interfaces simultaneously**:

| Interface | Purpose | Subnet |
|---|---|---|
| WiFi adapter | ESP32 AP connection | 192.168.4.0/24 |
| USB tethering | Internet via Android | varies |

### Route Configuration

The `scripts/setup-network.ps1` script:
1. Adds a specific route for `192.168.4.0/24` via WiFi adapter
2. Default route uses USB tethering for internet
3. Verifies both ESP32 and internet connectivity

### Firewall

The `scripts/setup-firewall.ps1` script creates an inbound rule allowing TCP port 3000 from the ESP32 subnet (192.168.4.0/24).

---

## Testing

### Automated Tests

```powershell
# Node.js integration tests (requires gateway running)
cd gateway-node
npm test

# Full pipeline test (requires ESP32 WiFi + internet)
powershell -ExecutionPolicy Bypass -File scripts\test-pipeline.ps1
```

### Manual Testing

```powershell
# Test ESP32 direct
Invoke-RestMethod http://192.168.4.1/api/data

# Test gateway POST
$body = @{device_id="test-01"; temperature=25.0; humidity=60} | ConvertTo-Json
Invoke-RestMethod -Uri http://localhost:3000/sensor-data -Method POST -Body $body -ContentType "application/json"

# Test gateway health
Invoke-RestMethod http://localhost:3000/health

# Test Supabase (from dashboard)
# Open http://localhost:5173 and check data display
```

---

## Debugging Commands

```powershell
# Network diagnostics
ipconfig /all                              # Show all adapters
route print                                # Show routing table
ping 192.168.4.1                           # Test ESP32 reachability
ping 8.8.8.8                               # Test internet
nslookup google.com                        # Test DNS

# Gateway logs
Get-Content gateway-node\gateway.log -Tail 50 -Wait   # Live log tail

# Firewall
Get-NetFirewallRule -DisplayName "SafetyHub*"          # Check rules
netstat -an | Select-String ":3000"                    # Check port binding

# ESP32 Serial Monitor
# Arduino IDE → Tools → Serial Monitor → 115200 baud
```

---

## Troubleshooting

| Symptom | Check |
|---|---|
| ESP32 Offline in dashboard | Confirm laptop is on "SafetyHub" WiFi |
| Gateway not receiving POST | Check firewall rule; verify ESP32 Serial Monitor shows POST attempts |
| Supabase insert failing | Check `.env` credentials; run `GET /health` to see Supabase status |
| Temperature shows 0 | Check DHT11 wiring + 10kΩ pull-up |
| gasLevel always 0 or 4095 | MQ2 needs 5V, GPIO 34 must be used |
| No internet through USB | Enable USB tethering on Android; run `setup-network.ps1` |
| Data not in Supabase | Check `gateway.log` for insert errors; verify RLS policies |
| Buffer growing | Supabase unreachable — check internet connectivity |
| Serial garbage | Confirm baud rate is 115200 |

---

## Project Structure

```
campus-safety-dashboard/
├── esp32/
│   └── SafetyHub.ino          # ESP32 firmware (AP + sensors + POST push)
├── gateway/
│   ├── gateway.py             # Python gateway (legacy, polling mode)
│   └── requirements.txt
├── gateway-node/
│   ├── server.js              # Node.js gateway (production, push mode)
│   ├── test.js                # Integration tests
│   ├── package.json
│   ├── .env                   # Your Supabase credentials
│   └── .env.example           # Template
├── supabase/
│   └── schema.sql             # Database table schema
├── scripts/
│   ├── setup-network.ps1      # Network routing setup
│   ├── setup-firewall.ps1     # Firewall rule setup
│   └── test-pipeline.ps1      # Full pipeline test
├── src/                       # React dashboard
│   ├── services/
│   │   ├── sensorService.js   # ESP32 + Supabase data fetching
│   │   └── supabaseClient.js  # Supabase JS client
│   ├── hooks/
│   │   └── useSensorData.js   # Dual-source data hook
│   ├── components/
│   ├── pages/
│   └── ...
├── package.json
├── vite.config.js
└── README.md
```
