import React from 'react'
import { AlertTriangle, CheckCircle } from 'lucide-react'

export default function AlertsPage({ history }) {
  // Derive alerts from history
  const alerts = history
    .filter(d => d.alert && d.alert !== 'System Normal')
    .slice()
    .reverse()

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-xs font-mono tracking-[0.2em] uppercase" style={{ color: 'var(--muted)' }}>Safety Hub</p>
        <h1 className="text-2xl font-display font-semibold tracking-tight text-white">Alert History</h1>
      </div>

      {alerts.length === 0 ? (
        <div className="glass flex flex-col items-center justify-center py-16 gap-3">
          <CheckCircle size={32} style={{ color: 'var(--cyan)' }} />
          <div className="text-sm font-sans text-white font-medium">All Clear</div>
          <div className="text-xs font-mono" style={{ color: 'var(--muted)' }}>No active alerts detected</div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {alerts.map((a, i) => (
            <div key={i} className="glass p-4 flex items-start gap-3"
              style={{
                borderColor: 'rgba(255,59,59,0.3)',
                boxShadow: '0 0 20px rgba(255,59,59,0.08)',
              }}>
              <div className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center"
                style={{ background: 'rgba(255,59,59,0.15)' }}>
                <AlertTriangle size={14} className="text-red-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-display font-semibold text-white leading-tight">
                    {a.alert}
                  </div>
                  <span className="flex-shrink-0 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(255,59,59,0.2)', color: '#FF3B3B', border: '1px solid rgba(255,59,59,0.3)' }}>
                    CRITICAL
                  </span>
                </div>
                <div className="text-[11px] font-mono mt-1.5 flex gap-3" style={{ color: 'var(--muted)' }}>
                  <span>{a.time}</span>
                  {a.gasLevel && <span>Gas: {a.gasLevel} ppm</span>}
                  {a.vibration && <span>Vib: {a.vibration} G</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Current status */}
      <div className="glass p-4">
        <div className="text-xs font-mono tracking-widest uppercase mb-3" style={{ color: 'var(--muted)' }}>Session Info</div>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Total Readings', val: history.length },
            { label: 'Session Alerts', val: alerts.length },
            { label: 'Data Points / Metric', val: `${history.length} / 20 max` },
            { label: 'Monitor Zone', val: 'Seminar Hall 1' },
          ].map(({ label, val }) => (
            <div key={label} className="rounded-xl p-3" style={{ background: 'rgba(0,255,200,0.04)', border: '1px solid rgba(0,255,200,0.08)' }}>
              <div className="text-[10px] font-mono uppercase tracking-wider" style={{ color: 'var(--muted)' }}>{label}</div>
              <div className="text-sm font-display font-semibold text-white mt-0.5">{val}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
