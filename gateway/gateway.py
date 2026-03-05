"""
SafetyHub Gateway  —  gateway.py
─────────────────────────────────────────────────────────────
Runs on your laptop while connected to the ESP32 WiFi AP.

Architecture:
    ESP32 (192.168.4.1/api/data)
        │  polled every 2 s
        ▼
    This FastAPI server  (localhost:8000)
        │
        ▼
    Dashboard  (localhost:5173)  or any browser

Endpoints:
    GET /sensor-data        →  latest sensor snapshot (JSON)
    GET /health             →  gateway + ESP32 status
    GET /history            →  last N readings (default 50)

Install:
    pip install fastapi uvicorn httpx

Run:
    python gateway.py
"""

import asyncio
import logging
import time
from datetime import datetime, timezone
from typing import Optional

import httpx
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# ── Config ───────────────────────────────────────────────────
ESP32_URL       = "http://192.168.4.1/api/data"
POLL_INTERVAL   = 2.0          # seconds between ESP32 polls
FETCH_TIMEOUT   = 3.0          # seconds before a request is considered failed
HISTORY_MAX     = 100          # rolling window of readings kept in memory
LOG_LEVEL       = logging.INFO

# ── Logging ──────────────────────────────────────────────────
logging.basicConfig(
    level=LOG_LEVEL,
    format="%(asctime)s  %(levelname)-7s  %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("gateway")

# ── State ────────────────────────────────────────────────────
class GatewayState:
    def __init__(self):
        self.latest: Optional[dict]  = None
        self.esp32_online: bool      = False
        self.last_success: Optional[str] = None
        self.last_error: Optional[str]   = None
        self.consecutive_failures: int   = 0
        self.history: list[dict]         = []
        self.total_reads: int            = 0
        self.total_errors: int           = 0

state = GatewayState()

# ── FastAPI app ──────────────────────────────────────────────
app = FastAPI(
    title="SafetyHub Gateway",
    description="Proxies real-time sensor data from ESP32 to local dashboard",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],     # dashboard on localhost:5173 can reach us
    allow_methods=["GET"],
    allow_headers=["*"],
)

# ── Background polling task ──────────────────────────────────
async def poll_esp32():
    """Continuously fetch sensor data from the ESP32 AP."""
    async with httpx.AsyncClient(timeout=FETCH_TIMEOUT) as client:
        while True:
            try:
                resp = await client.get(ESP32_URL)
                resp.raise_for_status()
                data: dict = resp.json()

                # Validate required keys
                required = {"temperature", "humidity", "gasLevel", "vibration", "alert"}
                if not required.issubset(data.keys()):
                    raise ValueError(f"Missing fields in ESP32 response: {data}")

                ts = datetime.now(timezone.utc).isoformat()
                enriched = {**data, "timestamp": ts, "source": "esp32"}

                state.latest            = enriched
                state.esp32_online      = True
                state.last_success      = ts
                state.last_error        = None
                state.consecutive_failures = 0
                state.total_reads      += 1

                # Rolling history
                state.history.append(enriched)
                if len(state.history) > HISTORY_MAX:
                    state.history.pop(0)

                log.debug(
                    "ESP32 OK | temp=%.1f  hum=%.1f  gas=%d  vib=%.3f  alert=%s",
                    data["temperature"], data["humidity"],
                    data["gasLevel"],   data["vibration"], data["alert"],
                )

            except httpx.ConnectError:
                _handle_error("ESP32 unreachable — is your laptop connected to 'SafetyHub' WiFi?")
            except httpx.TimeoutException:
                _handle_error(f"ESP32 request timed out (>{FETCH_TIMEOUT}s)")
            except httpx.HTTPStatusError as e:
                _handle_error(f"ESP32 HTTP error: {e.response.status_code}")
            except ValueError as e:
                _handle_error(f"Bad ESP32 data: {e}")
            except Exception as e:
                _handle_error(f"Unexpected error: {e}")

            await asyncio.sleep(POLL_INTERVAL)


def _handle_error(msg: str):
    state.esp32_online           = False
    state.last_error             = msg
    state.consecutive_failures  += 1
    state.total_errors          += 1

    if state.consecutive_failures == 1 or state.consecutive_failures % 10 == 0:
        log.warning("ESP32 OFFLINE [%d failures] — %s", state.consecutive_failures, msg)


@app.on_event("startup")
async def startup():
    log.info("SafetyHub Gateway starting — polling %s every %.1fs", ESP32_URL, POLL_INTERVAL)
    asyncio.create_task(poll_esp32())

# ── Endpoints ────────────────────────────────────────────────

@app.get("/sensor-data", summary="Latest sensor snapshot")
async def get_sensor_data():
    """
    Returns the most recent sensor reading from the ESP32.
    If the ESP32 is offline, returns a 503 with an error payload.
    """
    if not state.esp32_online or state.latest is None:
        return JSONResponse(
            status_code=503,
            content={
                "error":    "ESP32 Offline",
                "detail":   state.last_error or "No data received yet",
                "failures": state.consecutive_failures,
            },
        )
    return state.latest


@app.get("/health", summary="Gateway + ESP32 health status")
async def health():
    return {
        "gateway":             "online",
        "esp32":               "online" if state.esp32_online else "offline",
        "last_success":        state.last_success,
        "last_error":          state.last_error,
        "consecutive_failures": state.consecutive_failures,
        "total_reads":         state.total_reads,
        "total_errors":        state.total_errors,
        "history_count":       len(state.history),
        "poll_interval_s":     POLL_INTERVAL,
        "esp32_url":           ESP32_URL,
    }


@app.get("/history", summary="Rolling history of sensor readings")
async def get_history(limit: int = 50):
    """Returns the last `limit` sensor readings (max 100)."""
    limit = min(limit, HISTORY_MAX)
    return {
        "count":    min(limit, len(state.history)),
        "readings": state.history[-limit:],
    }


# ── Entry point ──────────────────────────────────────────────
if __name__ == "__main__":
    uvicorn.run(
        "gateway:app",
        host="0.0.0.0",
        port=8000,
        reload=False,
        log_level="info",
    )
