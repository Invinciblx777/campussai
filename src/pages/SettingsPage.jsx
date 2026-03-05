import React from 'react'
import { Cpu, Wifi, RefreshCw } from 'lucide-react'

function InfoRow({ label, value, valueClass }) {
  return (
    <div className="flex items-center justify-between py-3"
      style={{ borderBottom: '1px solid rgba(0,255,200,0.06)' }}>
      <span className="text-sm font-sans" style={{ color: 'var(--muted)' }}>{label}</span>
      <span className={`text-sm font-mono font-medium ${valueClass || 'text-white'}`}>{value}</span>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div className="glass p-5">
      <div className="text-xs font-mono tracking-widest uppercase mb-3" style={{ color: 'var(--muted)' }}>{title}</div>
      {children}
    </div>
  )
}

export default function SettingsPage({ status, lastUpdated }) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-xs font-mono tracking-[0.2em] uppercase" style={{ color: 'var(--muted)' }}>Safety Hub</p>
        <h1 className="text-2xl font-display font-semibold tracking-tight text-white">Settings</h1>
      </div>

      <Section title="System Information">
        <InfoRow label="Version"      value="1.0.0" />
        <InfoRow label="Zone"         value="KGiSL – Seminar Hall 1" />
        <InfoRow label="Data Refresh" value="2 Hz" />
        <InfoRow label="Last Updated"
          value={lastUpdated ? lastUpdated.toLocaleTimeString() : '—'} />
        <InfoRow
          label="ESP32 Status"
          value={status === 'online' ? '● Connected' : '○ Offline / Demo'}
          valueClass={status === 'online' ? 'text-emerald-400' : 'text-red-400'}
        />
      </Section>

      <Section title="Alert Thresholds">
        <div className="text-xs font-sans mb-3" style={{ color: 'var(--muted)' }}>
          Configured in firmware — read-only in v1
        </div>
        <InfoRow label="Earthquake"       value="≥ 2.5 G"    valueClass="text-red-400 font-mono" />
        <InfoRow label="Gas Leak"         value="> 800 ppm"   valueClass="text-red-400 font-mono" />
        <InfoRow label="High Temperature" value="> 45.0 °C"   valueClass="text-red-400 font-mono" />
        <InfoRow label="High Humidity"    value="> 90 %"      valueClass="text-red-400 font-mono" />
      </Section>

      <Section title="Sensor Hardware">
        <InfoRow label="Seismic"         value="MPU6050" />
        <InfoRow label="Gas"             value="MQ-Series" />
        <InfoRow label="Temp / Humidity" value="DHT11" />
        <InfoRow label="Controller"      value="ESP32 DevKit V1" />
        <InfoRow label="Firmware"        value="SafetyHub v1.0" />
      </Section>

      <Section title="Network">
        <InfoRow label="API Endpoint"   value="192.168.4.1/api/data" />
        <InfoRow label="WiFi SSID"      value="ESP32-SafetyHub" />
        <InfoRow
          label="Connection"
          value={status === 'online' ? 'Live ESP32' : 'Demo Mode'}
          valueClass={status === 'online' ? 'text-emerald-400' : 'text-yellow-400'}
        />
      </Section>

      <div className="glass p-4 text-center">
        <div className="flex items-center justify-center gap-2 mb-1">
          <Cpu size={12} style={{ color: 'var(--cyan)' }} />
          <span className="text-xs font-mono" style={{ color: 'var(--cyan)' }}>Campus Safety Hub</span>
        </div>
        <div className="text-[10px] font-mono" style={{ color: 'var(--muted)' }}>
          KGiSL Hackathon 2025 · ESP32 IoT System
        </div>
      </div>
    </div>
  )
}
