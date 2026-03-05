import React from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'

const CustomTooltip = ({ active, payload, label, unit, color }) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass px-3 py-2 text-xs font-mono" style={{ borderColor: `${color}40` }}>
        <div style={{ color: 'var(--muted)' }}>{label}</div>
        <div style={{ color }}>{payload[0].value}{unit}</div>
      </div>
    )
  }
  return null
}

export default function RealtimeChart({ data, dataKey, label, unit, color = '#00FFC8', domain }) {
  return (
    <div className="glass p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono tracking-widest uppercase" style={{ color: 'var(--muted)' }}>{label}</span>
        <span className="text-xs font-mono" style={{ color }}>{data.length > 0 ? `${data[data.length-1]?.[dataKey] ?? '—'}${unit}` : '—'}</span>
      </div>
      <ResponsiveContainer width="100%" height={80}>
        <AreaChart data={data} margin={{ top: 2, right: 2, left: -30, bottom: 0 }}>
          <defs>
            <linearGradient id={`grad-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.25} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="time" hide />
          <YAxis domain={domain || ['auto', 'auto']} tick={{ fontSize: 9, fill: '#5A7068', fontFamily: 'JetBrains Mono' }} />
          <Tooltip content={<CustomTooltip unit={unit} color={color} />} />
          <Area
            type="monotoneX"
            dataKey={dataKey}
            stroke={color}
            strokeWidth={1.5}
            fill={`url(#grad-${dataKey})`}
            dot={false}
            activeDot={{ r: 3, fill: color, strokeWidth: 0 }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
