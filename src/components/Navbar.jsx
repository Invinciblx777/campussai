import React from 'react'
import { LayoutGrid, Map, Bell, BarChart2, Settings } from 'lucide-react'

const TABS = [
  { id: 'home',      label: 'Home',      Icon: LayoutGrid },
  { id: 'map',       label: 'Map',       Icon: Map },
  { id: 'alerts',    label: 'Alerts',    Icon: Bell },
  { id: 'analytics', label: 'Analytics', Icon: BarChart2 },
  { id: 'settings',  label: 'Settings',  Icon: Settings },
]

export default function Navbar({ active, onChange, alertCount = 0 }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50"
      style={{ background: 'rgba(8,12,14,0.95)', borderTop: '1px solid rgba(0,255,200,0.08)', backdropFilter: 'blur(20px)' }}>
      <div className="max-w-lg mx-auto flex items-center justify-around px-2 py-2">
        {TABS.map(({ id, label, Icon }) => {
          const isActive = active === id
          return (
            <button key={id} onClick={() => onChange(id)}
              className={`nav-item flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all duration-200 ${isActive ? 'active' : ''}`}
              style={{ color: isActive ? 'var(--cyan)' : 'var(--muted)', background: isActive ? 'rgba(0,255,200,0.06)' : 'transparent' }}>
              <div className="relative">
                <Icon size={20} strokeWidth={isActive ? 2 : 1.5} />
                {id === 'alerts' && alertCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-mono flex items-center justify-center font-bold">
                    {alertCount > 9 ? '9+' : alertCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-mono tracking-wider">{label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
