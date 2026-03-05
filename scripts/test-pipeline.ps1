# ============================================================
#  SafetyHub — Pipeline Test Script (Windows 11)
# ============================================================
#  Tests the full ESP32 → Gateway → Supabase pipeline.
#
#  Usage:
#    powershell -ExecutionPolicy Bypass -File scripts\test-pipeline.ps1
# ============================================================

Write-Host ""
Write-Host "╔══════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   SafetyHub — Pipeline Integration Tests     ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

$passed = 0
$failed = 0
$gatewayUrl = "http://localhost:3000"

function Test-Step {
    param([string]$Name, [scriptblock]$Test)
    Write-Host "  Testing: $Name..." -NoNewline
    try {
        $result = & $Test
        if ($result) {
            Write-Host " PASS" -ForegroundColor Green
            $script:passed++
        } else {
            Write-Host " FAIL" -ForegroundColor Red
            $script:failed++
        }
    } catch {
        Write-Host " FAIL ($_)" -ForegroundColor Red
        $script:failed++
    }
}

# ── Network Tests ────────────────────────────────────────────
Write-Host "── Network Connectivity ──" -ForegroundColor Yellow

Test-Step "ESP32 reachable (ping 192.168.4.1)" {
    Test-Connection -ComputerName 192.168.4.1 -Count 1 -Quiet -ErrorAction SilentlyContinue
}

Test-Step "Internet reachable (ping 8.8.8.8)" {
    Test-Connection -ComputerName 8.8.8.8 -Count 1 -Quiet -ErrorAction SilentlyContinue
}

Test-Step "DNS resolution (google.com)" {
    try { Resolve-DnsName google.com -ErrorAction Stop | Out-Null; $true } catch { $false }
}

# ── Gateway Tests ────────────────────────────────────────────
Write-Host ""
Write-Host "── Gateway Server ──" -ForegroundColor Yellow

Test-Step "Gateway health endpoint" {
    try {
        $r = Invoke-RestMethod -Uri "$gatewayUrl/health" -TimeoutSec 5
        $r.gateway -eq "online"
    } catch { $false }
}

Test-Step "POST valid sensor data" {
    try {
        $body = @{
            device_id = "test-pipeline-01"
            temperature = 25.5
            humidity = 55.0
            gasLevel = 300
            vibration = 0.1
            alert = "System Normal"
        } | ConvertTo-Json
        $r = Invoke-RestMethod -Uri "$gatewayUrl/sensor-data" -Method POST -Body $body -ContentType "application/json" -TimeoutSec 5
        $r.status -eq "ok"
    } catch { $false }
}

Test-Step "POST invalid payload (no device_id) → 400" {
    try {
        $body = @{ temperature = 25.0; humidity = 50.0 } | ConvertTo-Json
        $null = Invoke-WebRequest -Uri "$gatewayUrl/sensor-data" -Method POST -Body $body -ContentType "application/json" -TimeoutSec 5 -ErrorAction Stop
        $false  # should have thrown
    } catch {
        $_.Exception.Response.StatusCode.Value__ -eq 400
    }
}

Test-Step "POST empty payload → 400" {
    try {
        $body = "{}" 
        $null = Invoke-WebRequest -Uri "$gatewayUrl/sensor-data" -Method POST -Body $body -ContentType "application/json" -TimeoutSec 5 -ErrorAction Stop
        $false
    } catch {
        $_.Exception.Response.StatusCode.Value__ -eq 400
    }
}

Test-Step "GET /sensor-data returns latest" {
    try {
        $r = Invoke-RestMethod -Uri "$gatewayUrl/sensor-data" -TimeoutSec 5
        $r.latest.device_id -eq "test-pipeline-01"
    } catch { $false }
}

Test-Step "GET /nonexistent → 404" {
    try {
        $null = Invoke-WebRequest -Uri "$gatewayUrl/nonexistent" -TimeoutSec 5 -ErrorAction Stop
        $false
    } catch {
        $_.Exception.Response.StatusCode.Value__ -eq 404
    }
}

# ── ESP32 Direct Test ────────────────────────────────────────
Write-Host ""
Write-Host "── ESP32 Direct Access ──" -ForegroundColor Yellow

Test-Step "ESP32 GET /api/data" {
    try {
        $r = Invoke-RestMethod -Uri "http://192.168.4.1/api/data" -TimeoutSec 5
        $null -ne $r.temperature
    } catch { $false }
}

# ── Summary ──────────────────────────────────────────────────
Write-Host ""
Write-Host "══════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  Results: $passed passed, $failed failed" -ForegroundColor $(if ($failed -eq 0) {"Green"} else {"Red"})
Write-Host "══════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

if ($failed -gt 0) {
    Write-Host "  Tips for failed tests:" -ForegroundColor Yellow
    Write-Host "  - ESP32: Connect laptop to 'SafetyHub' WiFi" -ForegroundColor Yellow
    Write-Host "  - Internet: Enable USB tethering on Android" -ForegroundColor Yellow
    Write-Host "  - Gateway: Run 'cd gateway-node && npm start'" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}
