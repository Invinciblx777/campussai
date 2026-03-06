import React, { useState, useEffect } from 'react'
import { WifiOff, Wifi, Cloud, CloudOff } from 'lucide-react'
import Navbar from './components/Navbar'
import HomePage from './pages/HomePage'
import MapPage from './pages/MapPage'
import AlertsPage from './pages/AlertsPage'
import AnalyticsPage from './pages/AnalyticsPage'
import SettingsPage from './pages/SettingsPage'
import useSensorData from './hooks/useSensorData'
import useAlertSystem from './hooks/useAlertSystem'
import { AlertStack } from './components/AlertBanner'
import InstallPrompt from './components/InstallPrompt'

function OfflineBanner({ dataSource }) {
  const isCloud = typeof window !== 'undefined' && !window.location.hostname.includes('localhost')

  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl mb-4"
      style={{
        background: 'rgba(255,59,59,0.1)',
        border: '1px solid rgba(255,59,59,0.35)',
        boxShadow: '0 0 24px rgba(255,59,59,0.15)',
      }}>
      {isCloud ? <CloudOff size={16} className="text-red-400 flex-shrink-0" /> : <WifiOff size={16} className="text-red-400 flex-shrink-0" />}
      <div>
        <div className="text-xs font-mono tracking-widest text-red-400 uppercase font-semibold">
          {isCloud ? 'Sensor Data Unavailable' : 'ESP32 Offline'}
        </div>
        <div className="text-xs font-sans text-red-300 mt-0.5">
          {isCloud
            ? 'No data in Supabase yet — ensure the gateway is running and pushing data.'
            : 'Cannot reach 192.168.4.1 — connect to the ESP32 WiFi and retry.'}
        </div>
      </div>
    </div>
  )
}

function ConnectingBanner() {
  const isCloud = typeof window !== 'undefined' && !window.location.hostname.includes('localhost')

  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl mb-4"
      style={{
        background: 'rgba(0,255,200,0.05)',
        border: '1px solid rgba(0,255,200,0.15)',
      }}>
      {isCloud
        ? <Cloud size={16} style={{ color: 'var(--cyan)' }} className="flex-shrink-0 animate-pulse" />
        : <Wifi size={16} style={{ color: 'var(--cyan)' }} className="flex-shrink-0 animate-pulse" />}
      <div className="text-xs font-mono" style={{ color: 'var(--muted)' }}>
        {isCloud ? 'Connecting to Supabase…' : 'Connecting to ESP32 at 192.168.4.1…'}
      </div>
    </div>
  )
}

function OnlineBanner({ dataSource }) {
  return (
    <div className="flex items-center gap-3 px-4 py-2 rounded-xl mb-4"
      style={{
        background: 'rgba(0,255,200,0.06)',
        border: '1px solid rgba(0,255,200,0.18)',
      }}>
      {dataSource === 'supabase'
        ? <Cloud size={14} style={{ color: 'var(--cyan)' }} className="flex-shrink-0" />
        : <Wifi size={14} style={{ color: 'var(--cyan)' }} className="flex-shrink-0" />}
      <div className="text-xs font-mono" style={{ color: 'var(--cyan)', opacity: 0.8 }}>
        {dataSource === 'supabase' ? 'Live — Supabase Cloud' : 'Live — ESP32 Direct'}
      </div>
    </div>
  )
}

export default function App() {
  const [tab, setTab] = useState('home')
  const { current, history, status, lastUpdated, alertActive, error, dataSource } = useSensorData()
  const { checkAlerts, activeAlerts, alertHistory, dismissAlert, dismissAllAlerts, notifPermission } = useAlertSystem()

  // Run alert checks whenever sensor data updates
  useEffect(() => {
    if (current && status === 'online') {
      checkAlerts(current)
    }
  }, [current, status, checkAlerts])

  // Alert count: active system alerts + history alerts
  const historyAlertCount = history.filter(d => d.alert && d.alert !== 'System Normal').length
  const totalAlertCount = activeAlerts.length + historyAlertCount

  const renderPage = () => {
    switch (tab) {
      case 'home': return <HomePage data={current} status={status} lastUpdated={lastUpdated} alertActive={alertActive || activeAlerts.length > 0} />
      case 'map': return <MapPage status={status} />
      case 'alerts': return <AlertsPage history={history} alertSystemHistory={alertHistory} />
      case 'analytics': return <AnalyticsPage data={current} history={history} />
      case 'settings': return <SettingsPage status={status} lastUpdated={lastUpdated} error={error} dataSource={dataSource} notifPermission={notifPermission} />
      default: return null
    }
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-48 rounded-full opacity-10"
          style={{ background: 'radial-gradient(ellipse, #00FFC8 0%, transparent 70%)', filter: 'blur(40px)' }} />
        <div className="absolute bottom-24 right-0 w-64 h-64 rounded-full opacity-5"
          style={{ background: 'radial-gradient(ellipse, #A78BFA 0%, transparent 70%)', filter: 'blur(50px)' }} />
      </div>

      <main className="relative z-10 max-w-lg mx-auto px-4 pt-14 pb-28">
        <div className="animate-fade-up">
          {/* PWA Install Prompt */}
          <InstallPrompt />

          {/* Connection Status */}
          {status === 'connecting' && <ConnectingBanner />}
          {status === 'offline' && <OfflineBanner dataSource={dataSource} />}
          {status === 'online' && <OnlineBanner dataSource={dataSource} />}

          {/* Active Alert Banners (from centralized alert system) */}
          <AlertStack alerts={activeAlerts} onDismiss={dismissAlert} />

          {renderPage()}
        </div>
      </main>

      <Navbar active={tab} onChange={setTab} alertCount={totalAlertCount} />
    </div>
  )
}
