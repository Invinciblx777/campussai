# ============================================================
#  SafetyHub — Firewall Setup Script (Windows 11)
# ============================================================
#  Opens port 3000 for the Node.js gateway so ESP32 can reach it.
#
#  Run as Administrator:
#    powershell -ExecutionPolicy Bypass -File scripts\setup-firewall.ps1
# ============================================================

Write-Host ""
Write-Host "╔══════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   SafetyHub — Firewall Configuration         ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

$ruleName = "SafetyHub-Gateway-Port3000"

# ── Check if rule already exists ─────────────────────────────
$existing = Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue

if ($existing) {
    Write-Host "  Firewall rule '$ruleName' already exists." -ForegroundColor Green
    Write-Host "  Status: $($existing.Enabled)" -ForegroundColor Green
} else {
    Write-Host "  Creating firewall rule for port 3000..." -ForegroundColor Yellow

    try {
        New-NetFirewallRule `
            -DisplayName $ruleName `
            -Direction Inbound `
            -Protocol TCP `
            -LocalPort 3000 `
            -Action Allow `
            -Profile Private,Domain `
            -Description "Allow ESP32 to reach SafetyHub Node.js gateway on port 3000" `
            -RemoteAddress 192.168.4.0/24

        Write-Host "  Firewall rule created successfully!" -ForegroundColor Green
    } catch {
        Write-Host "  FAILED to create firewall rule: $_" -ForegroundColor Red
        Write-Host "  Make sure you are running this script as Administrator." -ForegroundColor Yellow
        exit 1
    }
}

# ── Verify the rule ──────────────────────────────────────────
Write-Host ""
Write-Host "── Firewall Rule Details ──" -ForegroundColor Yellow
$rule = Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue
if ($rule) {
    Write-Host "  Name:      $($rule.DisplayName)" -ForegroundColor White
    Write-Host "  Direction: $($rule.Direction)" -ForegroundColor White
    Write-Host "  Action:    $($rule.Action)" -ForegroundColor White
    Write-Host "  Enabled:   $($rule.Enabled)" -ForegroundColor White
    Write-Host "  Profile:   $($rule.Profile)" -ForegroundColor White

    $portFilter = Get-NetFirewallPortFilter -AssociatedNetFirewallRule $rule
    Write-Host "  Protocol:  $($portFilter.Protocol)" -ForegroundColor White
    Write-Host "  Port:      $($portFilter.LocalPort)" -ForegroundColor White

    $addrFilter = Get-NetFirewallAddressFilter -AssociatedNetFirewallRule $rule
    Write-Host "  Remote:    $($addrFilter.RemoteAddress)" -ForegroundColor White
}

# ── Test connectivity ────────────────────────────────────────
Write-Host ""
Write-Host "── Connectivity Test ──" -ForegroundColor Yellow

# Check if gateway is running
Write-Host "  Testing gateway on localhost:3000..." -NoNewline
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/health" -TimeoutSec 3 -ErrorAction Stop
    Write-Host " OK (gateway is running)" -ForegroundColor Green
} catch {
    Write-Host " NOT RUNNING" -ForegroundColor Yellow
    Write-Host "    → Start the gateway: cd gateway-node && npm start" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "── Firewall setup complete ──" -ForegroundColor Green
Write-Host ""
