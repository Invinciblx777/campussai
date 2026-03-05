import React from 'react'
import { MapPin, Radio } from 'lucide-react'

export default function MapPage({ status }) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-xs font-mono tracking-[0.2em] uppercase" style={{ color: 'var(--muted)' }}>Safety Hub</p>
        <h1 className="text-2xl font-display font-semibold tracking-tight text-white">Campus Map</h1>
      </div>

      {/* Map Canvas */}
      <div className="glass relative overflow-hidden" style={{ height: 340 }}>
        {/* Grid background */}
        <div className="absolute inset-0 grid-bg opacity-60 rounded-2xl" />
        {/* Scan line */}
        <div className="absolute inset-0 scanline rounded-2xl pointer-events-none" />

        {/* Building outlines (SVG schematic) */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 360 340" preserveAspectRatio="xMidYMid meet">
          <g stroke="rgba(0,255,200,0.2)" strokeWidth="1" fill="none">
            {/* Buildings */}
            <rect x="30" y="30" width="80" height="60" rx="3"/>
            <rect x="130" y="30" width="60" height="40" rx="3"/>
            <rect x="210" y="30" width="100" height="80" rx="3"/>
            <rect x="30" y="120" width="120" height="80" rx="3"/>
            <rect x="175" y="140" width="80" height="60" rx="3"/>
            <rect x="275" y="140" width="55" height="50" rx="3"/>
            <rect x="60" y="230" width="200" height="70" rx="3"/>
            <rect x="280" y="220" width="50" height="80" rx="3"/>
            {/* Roads */}
            <line x1="120" y1="0" x2="120" y2="340" strokeDasharray="4 8" stroke="rgba(0,255,200,0.1)"/>
            <line x1="0" y1="200" x2="360" y2="200" strokeDasharray="4 8" stroke="rgba(0,255,200,0.1)"/>
          </g>
          {/* Sensor dot pulse rings */}
          <circle cx="175" cy="165" r="20" stroke="rgba(0,255,200,0.15)" strokeWidth="1" fill="none">
            <animate attributeName="r" values="15;30;15" dur="3s" repeatCount="indefinite"/>
            <animate attributeName="opacity" values="0.3;0;0.3" dur="3s" repeatCount="indefinite"/>
          </circle>
          <circle cx="175" cy="165" r="12" stroke="rgba(0,255,200,0.25)" strokeWidth="1" fill="none">
            <animate attributeName="r" values="8;20;8" dur="3s" begin="0.5s" repeatCount="indefinite"/>
            <animate attributeName="opacity" values="0.5;0;0.5" dur="3s" begin="0.5s" repeatCount="indefinite"/>
          </circle>
          {/* Sensor dot */}
          <circle cx="175" cy="165" r="5" fill="#00FFC8" filter="url(#glow)"/>
          <defs>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="blur"/>
              <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>
        </svg>

        {/* Label */}
        <div className="absolute left-1/2 -translate-x-1/2" style={{ top: 185 }}>
          <div className="glass px-3 py-1.5 rounded-lg text-center" style={{ border: '1px solid rgba(0,255,200,0.2)' }}>
            <div className="text-xs font-display font-semibold text-white">KGiSL – Seminar Hall 1</div>
            <div className="text-[10px] font-mono" style={{ color: 'var(--cyan)' }}>Active Monitoring</div>
          </div>
        </div>

        {/* Corner badge */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5 glass px-2 py-1 rounded-md">
          <Radio size={10} style={{ color: 'var(--cyan)' }} />
          <span className="text-[10px] font-mono" style={{ color: 'var(--cyan)' }}>
            {status === 'online' ? 'ESP32 LIVE' : 'DEMO MODE'}
          </span>
        </div>
      </div>

      {/* Zone info */}
      <div className="glass p-4">
        <div className="text-xs font-mono tracking-widest uppercase mb-3" style={{ color: 'var(--muted)' }}>Active Zones</div>
        <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'rgba(0,255,200,0.05)', border: '1px solid rgba(0,255,200,0.12)' }}>
          <div className="w-2 h-2 rounded-full bg-emerald-400" style={{ boxShadow: '0 0 6px #34d399' }} />
          <div className="flex-1">
            <div className="text-sm font-sans font-medium text-white">Seminar Hall 1</div>
            <div className="text-xs font-mono" style={{ color: 'var(--muted)' }}>KGiSL Campus · Block A</div>
          </div>
          <MapPin size={14} style={{ color: 'var(--cyan)' }} />
        </div>
      </div>

      <div className="glass px-4 py-3 rounded-xl text-center">
        <span className="text-xs font-mono" style={{ color: 'var(--muted)' }}>
          Interactive multi-zone overlay coming in v2
        </span>
      </div>
    </div>
  )
}
