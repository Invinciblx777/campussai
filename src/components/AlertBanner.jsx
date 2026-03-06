import React from 'react'
import { AlertTriangle, X, Flame, Wind, Activity, Droplets } from 'lucide-react'

const ALERT_ICONS = {
  gas: Wind,
  temperature: Flame,
  seismic: Activity,
  humidity: Droplets,
}

const ALERT_COLORS = {
  gas: { bg: 'rgba(0,255,200,0.1)', border: 'rgba(0,255,200,0.35)', text: '#00FFC8', shadow: 'rgba(0,255,200,0.15)' },
  temperature: { bg: 'rgba(255,107,53,0.1)', border: 'rgba(255,107,53,0.35)', text: '#FF6B35', shadow: 'rgba(255,107,53,0.15)' },
  seismic: { bg: 'rgba(167,139,250,0.1)', border: 'rgba(167,139,250,0.35)', text: '#A78BFA', shadow: 'rgba(167,139,250,0.15)' },
  humidity: { bg: 'rgba(0,180,255,0.1)', border: 'rgba(0,180,255,0.35)', text: '#00B4FF', shadow: 'rgba(0,180,255,0.15)' },
}

const DEFAULT_COLORS = {
  bg: 'rgba(255,59,59,0.12)', border: 'rgba(255,59,59,0.4)', text: '#FF3B3B', shadow: 'rgba(255,59,59,0.2)'
}

/**
 * Single alert banner — supports both legacy (message/onDismiss) and new (alert object) interfaces
 */
export default function AlertBanner({ message, onDismiss, alert }) {
  // New interface: alert object with type, title, body
  if (alert) {
    const Icon = ALERT_ICONS[alert.type] || AlertTriangle
    const colors = ALERT_COLORS[alert.type] || DEFAULT_COLORS

    return (
      <div className="alert-banner relative flex items-center gap-3 px-4 py-3 rounded-xl mb-3 animate-fade-up"
        style={{
          background: colors.bg,
          border: `1px solid ${colors.border}`,
          boxShadow: `0 0 30px ${colors.shadow}`,
        }}>
        <div className="flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0"
          style={{ background: colors.bg }}>
          <Icon size={16} style={{ color: colors.text }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-mono tracking-widest uppercase font-semibold" style={{ color: colors.text }}>
            {alert.title}
          </div>
          <div className="text-sm font-sans mt-0.5 truncate" style={{ color: colors.text, opacity: 0.8 }}>
            {alert.body}
          </div>
        </div>
        {onDismiss && (
          <button onClick={() => onDismiss(alert.id)}
            className="p-1 transition-colors flex-shrink-0" style={{ color: `${colors.text}60` }}>
            <X size={14} />
          </button>
        )}
      </div>
    )
  }

  // Legacy interface
  if (!message || message === 'System Normal') return null

  return (
    <div className="alert-banner relative flex items-center gap-3 px-4 py-3 rounded-xl mb-4"
      style={{
        background: 'rgba(255,59,59,0.12)',
        border: '1px solid rgba(255,59,59,0.4)',
        boxShadow: '0 0 30px rgba(255,59,59,0.2)',
      }}>
      <div className="flex items-center justify-center w-8 h-8 rounded-lg"
        style={{ background: 'rgba(255,59,59,0.2)' }}>
        <AlertTriangle size={16} className="text-red-400" />
      </div>
      <div className="flex-1">
        <div className="text-xs font-mono tracking-widest text-red-400 uppercase font-semibold">Critical Alert</div>
        <div className="text-sm font-sans text-red-200 mt-0.5">{message}</div>
      </div>
      <button onClick={onDismiss}
        className="text-red-400/60 hover:text-red-400 transition-colors p-1">
        <X size={14} />
      </button>
    </div>
  )
}

/**
 * Renders a stack of active alert banners from the centralized alert system
 */
export function AlertStack({ alerts, onDismiss }) {
  if (!alerts || alerts.length === 0) return null

  return (
    <div className="flex flex-col gap-1">
      {alerts.map((a) => (
        <AlertBanner key={a.id} alert={a} onDismiss={onDismiss} />
      ))}
    </div>
  )
}
