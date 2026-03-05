import React from 'react'

const STATUS_CONFIG = {
  safe:    { label: 'SAFE',   cls: 'bg-emerald-900/40 text-emerald-400 border border-emerald-500/30' },
  warning: { label: 'WARN',  cls: 'bg-yellow-900/40 text-yellow-400 border border-yellow-500/30' },
  danger:  { label: 'DANGER', cls: 'bg-red-900/40 text-red-400 border border-red-500/30' },
}

export default function SensorCard({ icon: Icon, label, value, unit, status = 'safe', accent = '#00FFC8', sublabel, trend }) {
  const cfg = STATUS_CONFIG[status]

  return (
    <div
      className="glass relative overflow-hidden p-5 flex flex-col gap-3 transition-all duration-300"
      style={{
        borderColor: status === 'danger' ? 'rgba(255,59,59,0.3)' : status === 'warning' ? 'rgba(255,184,0,0.25)' : undefined,
        boxShadow: status === 'danger'
          ? '0 0 20px rgba(255,59,59,0.12)'
          : status === 'warning'
          ? '0 0 20px rgba(255,184,0,0.1)'
          : '0 0 20px rgba(0,255,200,0.06)',
      }}
    >
      {/* Top row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md flex items-center justify-center"
            style={{ background: `${accent}18`, border: `1px solid ${accent}30` }}>
            <Icon size={14} style={{ color: accent }} strokeWidth={2} />
          </div>
          <span className="text-xs font-mono tracking-widest uppercase" style={{ color: 'var(--muted)' }}>{label}</span>
        </div>
        <span className={`text-[10px] font-mono font-semibold tracking-widest px-2 py-0.5 rounded ${cfg.cls}`}>
          {cfg.label}
        </span>
      </div>

      {/* Value */}
      <div className="flex items-end gap-1.5">
        {value !== null && value !== undefined ? (
          <>
            <span className="text-4xl font-display font-semibold leading-none" style={{ color: accent }}>
              {value}
            </span>
            <span className="text-sm font-mono mb-1" style={{ color: 'var(--muted)' }}>{unit}</span>
            {trend !== undefined && (
              <span className={`text-xs font-mono mb-1 ml-1 ${trend >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {trend >= 0 ? '+' : ''}{trend}
              </span>
            )}
          </>
        ) : (
          <div className="h-10 w-24 rounded shimmer" />
        )}
      </div>

      {/* Sublabel */}
      {sublabel && (
        <span className="text-xs font-sans" style={{ color: 'var(--muted)' }}>{sublabel}</span>
      )}

      {/* Bottom glow line */}
      <div className="absolute bottom-0 left-0 right-0 h-[2px] opacity-40 rounded-b-2xl"
        style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }} />
    </div>
  )
}
