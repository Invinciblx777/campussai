import React from 'react'
import { Bell } from 'lucide-react'
import RealtimeChart from '../components/RealtimeChart'

function StatCard({ label, value, unit, color }) {
  return (
    <div className="glass p-4 flex flex-col gap-2">
      <div className="text-[10px] font-mono tracking-widest uppercase" style={{ color: 'var(--muted)' }}>{label}</div>
      <div className="text-2xl font-display font-bold leading-none" style={{ color }}>
        {value !== null && value !== undefined ? `${value}` : <span className="text-lg" style={{ color: 'var(--muted)' }}>—</span>}
        <span className="text-sm font-mono ml-1" style={{ color: 'var(--muted)' }}>{unit}</span>
      </div>
    </div>
  )
}

export default function AnalyticsPage({ data, history }) {
  const avg = (key) => {
    if (!history.length) return null
    return (history.reduce((s, d) => s + (d[key] || 0), 0) / history.length).toFixed(1)
  }
  const max = (key) => {
    if (!history.length) return null
    return Math.max(...history.map(d => d[key] || 0)).toFixed(1)
  }

  const alerts = history.filter(d => d.alert && d.alert !== 'System Normal').length

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-mono tracking-[0.2em] uppercase" style={{ color: 'var(--muted)' }}>Safety Hub</p>
          <h1 className="text-2xl font-display font-semibold tracking-tight text-white">Analytics</h1>
        </div>
        <div className="flex items-center gap-2 mt-1 glass px-3 py-1.5 rounded-lg"
          style={{ border: '1px solid rgba(167,139,250,0.3)' }}>
          <div className="live-dot" style={{ background: '#A78BFA', boxShadow: '0 0 6px #A78BFA' }} />
          <span className="text-[10px] font-mono" style={{ color: '#A78BFA' }}>LIVE</span>
        </div>
      </div>

      {/* Stat grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Avg Temperature" value={avg('temperature')} unit="°C" color="#FF6B35" />
        <StatCard label="Max Temperature" value={max('temperature')} unit="°C" color="#FFB800" />
        <StatCard label="Avg Gas Level"   value={avg('gasLevel')}   unit=" ppm" color="#00FFC8" />
        <StatCard label="Max Gas Level"   value={max('gasLevel')}   unit=" ppm" color="#FFB800" />
        <StatCard label="Avg Seismic"     value={avg('vibration')}  unit=" G"   color="#A78BFA" />
        <StatCard label="Max Seismic"     value={max('vibration')}  unit=" G"   color="#FF6B35" />
      </div>

      {/* Charts */}
      <div className="flex flex-col gap-3">
        <RealtimeChart data={history} dataKey="temperature" label="Temperature" unit="°C" color="#FF6B35" domain={[0, 60]} />
        <RealtimeChart data={history} dataKey="humidity"    label="Humidity"    unit="%" color="#00B4FF" domain={[0, 100]} />
        <RealtimeChart data={history} dataKey="gasLevel"    label="Gas Level"   unit=" ppm" color="#00FFC8" />
        <RealtimeChart data={history} dataKey="vibration"   label="Seismic"     unit=" G" color="#A78BFA" />
      </div>

      {/* Session summary */}
      <div className="glass p-4">
        <div className="text-xs font-mono tracking-widest uppercase mb-3" style={{ color: 'var(--muted)' }}>Session Summary</div>
        {[
          { label: 'Total Readings',    val: history.length },
          { label: 'Session Alerts',    val: alerts },
          { label: 'Historical Alerts', val: alerts },
          { label: 'Data Points / Metric', val: `${history.length} / 20 max` },
        ].map(({ label, val }) => (
          <div key={label} className="flex items-center justify-between py-2"
            style={{ borderBottom: '1px solid rgba(0,255,200,0.06)' }}>
            <span className="text-sm font-sans" style={{ color: 'var(--muted)' }}>{label}</span>
            <span className="text-sm font-mono font-medium text-white">{val}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
