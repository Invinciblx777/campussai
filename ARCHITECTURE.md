# Campus Safety Dashboard — System Architecture

This document provides a comprehensive overview of the fully operational IoT pipeline built for the Campus Safety Dashboard. It outlines the technology stack, components, and data flow from the physical sensors to the web dashboard.

## 1. High-Level Architecture

The system follows a classic decoupled IoT architecture:
- **Edge Layer:** ESP32 Microcontroller + Physical Sensors
- **Gateway Layer:** Local Node.js server running on a laptop
- **Cloud Layer:** Supabase PostgreSQL Database + REST API
- **Presentation Layer:** Next.js/Vite React Application hosted on Vercel

```mermaid
graph TD
    subgraph "Edge Layer (Local WiFi: 192.168.4.x)"
        ESP[ESP32 Microcontroller<br/>SafetyHub Firmware]
        S1((Temp/Hum)) --> ESP
        S2((Gas MQ2)) --> ESP
        S3((Seismic)) --> ESP
    end

    subgraph "Gateway Layer (Laptop)"
        Gateway[Node.js Express Server<br/>Port: 3000]
        Buffer[(Offline JSON Buffer)]
    end

    subgraph "Cloud Layer"
        Supabase[(Supabase PostgreSQL<br/>Table: sensor_data)]
    end

    subgraph "Presentation Layer (Vercel)"
        Web[React Web Dashboard<br/>campussai.vercel.app]
    end

    ESP -- "HTTP POST (Every 5s)" --> Gateway
    Gateway -- "File I/O" --- Buffer
    Gateway -- "REST API Insert" --> Supabase
    Web -- "REST API Select (Polls 2s)" --> Supabase
    Web -. "Fallback Fetch" .-> ESP
```

---

## 2. Component Details

### A. The Edge (ESP32)
- **Role:** Data collection and transmission.
- **Codebase:** `esp32/SafetyHub.ino`
- **Network:** Acts as a WiFi Access Point (`SSID: SafetyHub`).
- **Workflow:** 
  - Reads raw analog/digital data from sensors (DHT11, MQ2, MPU6050/Vibration).
  - Normalizes data into physical units (Celsius, %, ppm, G-force).
  - Connects to the Gateway IP (`192.168.4.10` or mapped `192.168.4.4`).
  - Pushes a JSON payload via `HTTP POST` every 5 seconds.
  - Maintains a local REST endpoint (`GET /api/data`) as a fallback for direct local access.

### B. The Gateway (Node.js)
- **Role:** Reliability bridge between the unstable local edge and the cloud.
- **Codebase:** `gateway-node/server.js`
- **Network:** Listens on `0.0.0.0:3000`. Bridged between local WiFi and internet (via USB tethering).
- **Workflow:**
  - Receives `POST /sensor-data` from the ESP32.
  - Validates payload structure and data types.
  - Attempts to insert the data into the Supabase `sensor_data` table.
  - **Offline Resilience:** If Supabase is unreachable (no internet), it pushes the data into an in-memory buffer (capable of holding `BUFFER_MAX_SIZE` readings).
  - Automatically flushes the offline buffer to Supabase once an internet connection is restored, ensuring zero data loss.

### C. The Database (Supabase)
- **Role:** Persistent cloud storage and historical record.
- **Codebase:** `supabase/schema.sql`
- **Schema:**
  - `id` (UUID, Primary Key)
  - `device_id` (String)
  - `temperature` (Float)
  - `humidity` (Float)
  - `gas_level` (Float)
  - `vibration` (Float)
  - `alert` (String)
  - `created_at` (Timestamp, Indexed for fast time-series queries)
- **Features:** Auto-scaling PostgreSQL instance with highly optimized built-in REST API (PostgREST).

### D. The Frontend Dashboard (React / Vite)
- **Role:** Data visualization and alerting.
- **Codebase:** `src/App.jsx`, `src/services/sensorService.js`, `src/hooks/useSensorData.js`
- **Hosting:** Deployed serverless on Vercel.
- **Workflow:**
  - Uses a custom React Hook (`useSensorData`) to poll Supabase every 2 seconds (`.order('created_at').limit(1).maybeSingle()`).
  - Adaptive UI displays a green "Live — Supabase Cloud" banner when connected.
  - Renders real-time statistics and historical charts (Analytics tab).
  - Evaluates thresholds (e.g., Gas > 800ppm) and dynamically triggers UI alerts.

---

## 3. Detailed Data Flow Sequence

This sequence diagram illustrates the step-by-step flow of a single sensor reading through the entire pipeline, including the offline buffering scenario.

```mermaid
sequenceDiagram
    participant S as Physical Sensors
    participant E as ESP32 (SafetyHub)
    participant G as Node.js Gateway
    participant DB as Supabase Cloud
    participant W as Vercel Dashboard

    loop Every 5 Seconds
        S->>E: Read analog/digital pins
        E->>E: Format JSON payload
        E->>G: POST /sensor-data (JSON)
        
        alt Internet is Available
            G->>DB: INSERT into sensor_data
            DB-->>G: 201 Created
            G-->>E: 200 OK (Data saved)
        else Internet is Down
            G--xDB: INSERT Timeout/Error
            G->>G: Append to Offline Buffer
            G-->>E: 202 Accepted (Buffered)
        end
    end

    loop Every 2 Seconds
        W->>DB: SELECT latest reading
        DB-->>W: Return single JSON object
        W->>W: Update UI & Charts
    end

    loop Background Process (Gateway)
        alt Buffer has data AND Internet Restored
            G->>DB: Bulk INSERT offline data
            DB-->>G: 201 Created
            G->>G: Clear buffer
        end
    end
```

## 4. Production Security & Reliability Features

1. **Gateway Rate Limiting:** Prevents the ESP32 (or malicious actors on the local network) from spamming the Supabase API. Capped at 60 requests per minute per IP.
2. **Graceful Degradation (`maybeSingle`):** The Vercel dashboard handles empty databases without crashing (fixing the `PGRST116` PostgREST error).
3. **Environment Separation:** Hardcoded API keys were removed. Supabase credentials (`SUPABASE_URL`, `SUPABASE_KEY`) are injected via Vercel Environment Variables in the cloud and local `.env` files on the Gateway.
4. **Resilient Retry Logic:** The Gateway uses an exponential backoff strategy (up to 3 retries) for Supabase inserts before falling back to the RAM buffer.
