# ============================================================
#  SafetyHub — Network Setup Script (Windows 11)
# ============================================================
#  Configures routing so ESP32 traffic uses WiFi adapter
#  and internet traffic uses USB tethering adapter.
#
#  Run as Administrator:
#    powershell -ExecutionPolicy Bypass -File scripts\setup-network.ps1
# ============================================================

Write-Host ""
Write-Host "╔══════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   SafetyHub — Network Configuration          ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# ── Step 1: Show current adapters ────────────────────────────
Write-Host "── Step 1: Network Adapters ──" -ForegroundColor Yellow
$adapters = Get-NetAdapter | Where-Object { $_.Status -eq "Up" }
$adapters | Format-Table Name, InterfaceDescription, Status, LinkSpeed -AutoSize

# ── Step 2: Identify WiFi and USB adapters ───────────────────
Write-Host "── Step 2: Identifying Adapters ──" -ForegroundColor Yellow

$wifiAdapter = $adapters | Where-Object {
    $_.InterfaceDescription -match "Wi-Fi|WiFi|Wireless|802\.11"
}
$usbAdapter = $adapters | Where-Object {
    $_.InterfaceDescription -match "RNDIS|USB|Android|Remote NDIS|Ethernet.*USB"
}

if ($wifiAdapter) {
    Write-Host "  WiFi adapter: $($wifiAdapter.Name) ($($wifiAdapter.InterfaceDescription))" -ForegroundColor Green
} else {
    Write-Host "  WARNING: No WiFi adapter found!" -ForegroundColor Red
    Write-Host "  Connect to the SafetyHub WiFi network first." -ForegroundColor Red
}

if ($usbAdapter) {
    Write-Host "  USB tethering: $($usbAdapter.Name) ($($usbAdapter.InterfaceDescription))" -ForegroundColor Green
} else {
    Write-Host "  WARNING: No USB tethering adapter found!" -ForegroundColor Red
    Write-Host "  Enable USB tethering on your Android phone." -ForegroundColor Red
}

# ── Step 3: Display current routes ───────────────────────────
Write-Host ""
Write-Host "── Step 3: Current Routing Table ──" -ForegroundColor Yellow
route print 192.168.4.* 2>$null | Select-String "192.168.4"

# ── Step 4: Configure routing ────────────────────────────────
Write-Host ""
Write-Host "── Step 4: Configuring Routes ──" -ForegroundColor Yellow

if ($wifiAdapter) {
    $wifiIndex = $wifiAdapter.ifIndex

    # Get WiFi adapter IP configuration
    $wifiIP = Get-NetIPAddress -InterfaceIndex $wifiIndex -AddressFamily IPv4 -ErrorAction SilentlyContinue
    if ($wifiIP) {
        Write-Host "  WiFi IP: $($wifiIP.IPAddress)" -ForegroundColor Green

        # Add route for ESP32 subnet (192.168.4.0/24) via WiFi adapter
        try {
            # Remove old route if exists
            route delete 192.168.4.0 2>$null | Out-Null
            # Add specific route for ESP32 subnet
            route add 192.168.4.0 mask 255.255.255.0 192.168.4.1 if $wifiIndex metric 1
            Write-Host "  Route added: 192.168.4.0/24 via WiFi adapter (index $wifiIndex)" -ForegroundColor Green
        } catch {
            Write-Host "  Failed to add route: $_" -ForegroundColor Red
        }
    }
}

if ($usbAdapter) {
    $usbIndex = $usbAdapter.ifIndex
    $usbIP = Get-NetIPAddress -InterfaceIndex $usbIndex -AddressFamily IPv4 -ErrorAction SilentlyContinue
    $usbGateway = Get-NetRoute -InterfaceIndex $usbIndex -DestinationPrefix "0.0.0.0/0" -ErrorAction SilentlyContinue

    if ($usbGateway) {
        Write-Host "  USB tethering gateway: $($usbGateway.NextHop)" -ForegroundColor Green
        Write-Host "  Default internet traffic will use USB tethering" -ForegroundColor Green
    } else {
        Write-Host "  No default gateway on USB adapter — internet may not work" -ForegroundColor Yellow
    }
}

# ── Step 5: Connectivity Tests ───────────────────────────────
Write-Host ""
Write-Host "── Step 5: Connectivity Tests ──" -ForegroundColor Yellow

# Test ESP32
Write-Host "  Testing ESP32 (192.168.4.1)..." -NoNewline
$pingESP = Test-Connection -ComputerName 192.168.4.1 -Count 2 -Quiet -ErrorAction SilentlyContinue
if ($pingESP) {
    Write-Host " OK" -ForegroundColor Green
} else {
    Write-Host " FAIL" -ForegroundColor Red
    Write-Host "    → Connect laptop to 'SafetyHub' WiFi (password: safetyhub123)" -ForegroundColor Yellow
}

# Test Internet
Write-Host "  Testing Internet (8.8.8.8)..." -NoNewline
$pingInternet = Test-Connection -ComputerName 8.8.8.8 -Count 2 -Quiet -ErrorAction SilentlyContinue
if ($pingInternet) {
    Write-Host " OK" -ForegroundColor Green
} else {
    Write-Host " FAIL" -ForegroundColor Red
    Write-Host "    → Enable USB tethering on your Android phone" -ForegroundColor Yellow
}

# Test DNS
Write-Host "  Testing DNS (google.com)..." -NoNewline
try {
    $dns = Resolve-DnsName google.com -ErrorAction Stop
    Write-Host " OK" -ForegroundColor Green
} catch {
    Write-Host " FAIL" -ForegroundColor Red
}

Write-Host ""
Write-Host "── Network setup complete ──" -ForegroundColor Green
Write-Host ""
