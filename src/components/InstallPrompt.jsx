import React, { useState, useEffect } from 'react'
import { Download, X, Smartphone } from 'lucide-react'

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [showBanner, setShowBanner] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
      return
    }

    const handler = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      // Show banner after a short delay (don't interrupt immediately)
      setTimeout(() => setShowBanner(true), 5000)
    }

    window.addEventListener('beforeinstallprompt', handler)

    // Detect when app is installed
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true)
      setShowBanner(false)
      setDeferredPrompt(null)
    })

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setIsInstalled(true)
    }
    setDeferredPrompt(null)
    setShowBanner(false)
  }

  if (isInstalled || !showBanner) return null

  return (
    <div className="relative flex items-center gap-3 px-4 py-3 rounded-xl mb-4 animate-fade-up"
      style={{
        background: 'linear-gradient(135deg, rgba(0,255,200,0.08) 0%, rgba(167,139,250,0.06) 100%)',
        border: '1px solid rgba(0,255,200,0.2)',
        boxShadow: '0 0 20px rgba(0,255,200,0.08)',
      }}>
      <div className="flex items-center justify-center w-10 h-10 rounded-xl flex-shrink-0"
        style={{ background: 'rgba(0,255,200,0.12)' }}>
        <Smartphone size={20} style={{ color: 'var(--cyan)' }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-sans font-medium text-white">Install SafetyHub</div>
        <div className="text-xs font-sans mt-0.5" style={{ color: 'var(--muted)' }}>
          Get real-time alerts as a standalone app
        </div>
      </div>
      <button
        onClick={handleInstall}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all"
        style={{
          background: 'rgba(0,255,200,0.15)',
          color: 'var(--cyan)',
          border: '1px solid rgba(0,255,200,0.3)',
        }}
      >
        <Download size={12} />
        Install
      </button>
      <button
        onClick={() => setShowBanner(false)}
        className="p-1 rounded-md transition-colors"
        style={{ color: 'var(--muted)' }}
      >
        <X size={14} />
      </button>
    </div>
  )
}
