import React, { useState } from 'react'
import { Thermometer, Droplets, Wind, Activity, Bell } from 'lucide-react'
import SensorCard from '../components/SensorCard'
import AlertBanner from '../components/AlertBanner'

function getSensorStatus(key, val) {
  if (val === null || val === undefined) return 'safe'
  const thresholds = {
    temperature: { warn: 35, danger: 45 },
    humidity:    { warn: 75, danger: 90 },
    gasLevel:    { warn: 500, danger: 800 },
    vibration:   { warn: 1.0, danger: 2.5 },
  }
  const t = thresholds[key]
  if (!t) return 'safe'
  if (val >= t.danger) return 'danger'
  if (val >= t.warn)   return 'warning'
  return 'safe'
}

function getSublabel(key, val) {
  if (val === null || val === undefined) return '—'
  const labels = {
    gasLevel:    ['Good Air', 'Moderate', 'Hazardous'],
    vibration:   ['Stable', 'Minor Activity', 'Earthquake!'],
    temperature: ['Comfortable', 'Warm', 'Critical Heat'],
    humidity:    ['Normal', 'High', 'Saturated'],
  }
  const t = { temperature: [35,45], humidity: [75,90], gasLevel: [500,800], vibration: [1.0,2.5] }
  const lb = labels[key]; const th = t[key]
  if (!lb) return ''
  if (val >= th[1]) return lb[2]
  if (val >= th[0]) return lb[1]
  return lb[0]
}

export default function HomePage({ data, status, lastUpdated, alertActive }) {
  const [dismissed, setDismissed] = useState(false)

  const sensors = [
    { key: 'temperature', label: 'Temperature', Icon: Thermometer, unit: '°C', accent: '#FF6B35',
      sublabel: getSublabel('temperature', data?.temperature) },
    { key: 'humidity',    label: 'Humidity',    Icon: Droplets,    unit: '%',  accent: '#00B4FF',
      sublabel: getSublabel('humidity', data?.humidity) },
    { key: 'gasLevel',    label: 'Gas Level',   Icon: Wind,        unit: ' ppm', accent: '#00FFC8',
      sublabel: getSublabel('gasLevel', data?.gasLevel) },
    { key: 'vibration',   label: 'Seismic',     Icon: Activity,    unit: ' G', accent: '#A78BFA',
      sublabel: getSublabel('vibration', data?.vibration) },
  ]

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-mono tracking-[0.2em] uppercase" style={{ color: 'var(--muted)' }}>Safety Hub</p>
          <h1 className="text-2xl font-display font-semibold tracking-tight text-white">KGiSL</h1>
        </div>
        <div className="flex items-center gap-3 mt-1">
          {alertActive && !dismissed && (
            <button className="relative" onClick={() => setDismissed(false)}>
              <Bell size={20} style={{ color: 'var(--cyan)' }} />
              <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-red-500 animate-ping" />
              <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-red-500" />
            </button>
          )}
          <div className="flex items-center gap-2 glass px-3 py-1.5 rounded-lg">
            <div className={`w-1.5 h-1.5 rounded-full ${status === 'online' ? 'bg-emerald-400' : 'bg-red-400'}`}
              style={status === 'online' ? { boxShadow: '0 0 6px #34d399' } : {}} />
            <span className="text-[10px] font-mono" style={{ color: 'var(--muted)' }}>
              {status === 'online' ? 'LIVE' : 'DEMO'}
            </span>
          </div>
        </div>
      </div>

      {/* Seismic Hero Card */}
      <div className="glass-active glow-cyan p-5 relative overflow-hidden"
        style={{ border: '1px solid rgba(0,255,200,0.2)' }}>
        <div className="absolute inset-0 grid-bg opacity-30 pointer-events-none rounded-2xl" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-1">
            <Activity size={14} style={{ color: 'var(--cyan)' }} />
            <span className="text-xs font-mono tracking-widest uppercase" style={{ color: 'var(--muted)' }}>Seismic Activity</span>
            <div className="ml-auto flex items-center gap-1.5 glass px-2 py-0.5 rounded-md">
              <div className="live-dot" />
              <span className="text-[10px] font-mono" style={{ color: 'var(--cyan)' }}>LIVE</span>
            </div>
          </div>
          <div className="flex items-end gap-4 mt-3">
            <div>
              <div className="text-6xl font-display font-bold leading-none" style={{ color: 'var(--cyan)' }}>
                {data?.vibration?.toFixed(2) ?? '—'}
              </div>
              <div className="text-xs font-mono mt-1" style={{ color: 'var(--muted)' }}>MAGNITUDE (G)</div>
            </div>
            <div className="ml-auto text-right pb-1">
              <div className="text-2xl font-display font-semibold" style={{ color: 'var(--muted)' }}>5.0 km</div>
              <div className="text-xs font-mono" style={{ color: 'var(--muted)' }}>DEPTH EST.</div>
            </div>
          </div>
          <div className={`mt-3 inline-flex items-center gap-1.5 text-xs font-mono font-semibold px-3 py-1 rounded-full ${
            getSensorStatus('vibration', data?.vibration) === 'danger'
              ? 'bg-red-900/50 text-red-400 border border-red-500/40'
              : getSensorStatus('vibration', data?.vibration) === 'warning'
              ? 'bg-yellow-900/40 text-yellow-400 border border-yellow-500/30'
              : 'bg-emerald-900/40 text-emerald-400 border border-emerald-500/30'
          }`}>
            <span>{getSublabel('vibration', data?.vibration)}</span>
          </div>
        </div>
      </div>

      {/* Alert Banner */}
      {alertActive && !dismissed && (
        <AlertBanner message={data?.alert} onDismiss={() => setDismissed(true)} />
      )}

      {/* Sensor Cards Grid */}
      <div className="grid grid-cols-2 gap-3">
        <SensorCard
          icon={sensors[0].Icon}
          label={sensors[0].label}
          value={data?.temperature?.toFixed(1) ?? null}
          unit={sensors[0].unit}
          status={getSensorStatus('temperature', data?.temperature)}
          accent={sensors[0].accent}
          sublabel={sensors[0].sublabel}
        />
        <SensorCard
          icon={sensors[1].Icon}
          label={sensors[1].label}
          value={data?.humidity?.toFixed(1) ?? null}
          unit={sensors[1].unit}
          status={getSensorStatus('humidity', data?.humidity)}
          accent={sensors[1].accent}
          sublabel={sensors[1].sublabel}
        />
      </div>

      <SensorCard
        icon={sensors[2].Icon}
        label={sensors[2].label}
        value={data?.gasLevel ?? null}
        unit={sensors[2].unit}
        status={getSensorStatus('gasLevel', data?.gasLevel)}
        accent={sensors[2].accent}
        sublabel={sensors[2].sublabel}
      />

      {/* Last updated */}
      <div className="flex items-center justify-center gap-2 py-1">
        <div className="h-px flex-1" style={{ background: 'var(--border)' }} />
        <span className="text-[10px] font-mono" style={{ color: 'var(--muted)' }}>
          {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : 'Connecting...'}
        </span>
        <div className="h-px flex-1" style={{ background: 'var(--border)' }} />
      </div>
    </div>
  )
}
