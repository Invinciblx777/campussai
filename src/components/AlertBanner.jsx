import React from 'react'
import { AlertTriangle, X } from 'lucide-react'

export default function AlertBanner({ message, onDismiss }) {
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
        <div className="text-xs font-mono tracking-widest text-red-400 uppercase font-semibold">⚠ Critical Alert</div>
        <div className="text-sm font-sans text-red-200 mt-0.5">{message}</div>
      </div>
      <button onClick={onDismiss}
        className="text-red-400/60 hover:text-red-400 transition-colors p-1">
        <X size={14} />
      </button>
    </div>
  )
}
