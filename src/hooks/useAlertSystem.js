import { useRef, useCallback, useEffect, useState } from 'react'

// ── Thresholds ──────────────────────────────────────────────
const THRESHOLDS = {
  gas:         { value: 800,  label: 'Gas Leak Detected',          unit: 'ppm',       icon: '/icons/alert.png' },
  temperature: { value: 45,   label: 'High Temperature Alert',     unit: '°C',        icon: '/icons/alert.png' },
  seismic:     { value: 2.5,  label: 'Seismic Activity Detected',  unit: ' magnitude', icon: '/icons/alert.png' },
  humidity:    { value: 85,   label: 'High Humidity Alert',        unit: '%',         icon: '/icons/alert.png' },
}

// Debounce: don't re-trigger same alert type within 30 seconds
const DEBOUNCE_MS = 30_000

/**
 * Centralized alert system with:
 * - Browser push notifications
 * - Mobile vibration
 * - Audio beep
 * - Alert banner state
 * - Debounce per alert type
 */
export default function useAlertSystem() {
  const [notifPermission, setNotifPermission] = useState('default')
  const [activeAlerts, setActiveAlerts] = useState([])      // current active alerts
  const [alertHistory, setAlertHistory] = useState([])       // history of all alerts
  const lastTriggered = useRef({})                           // debounce tracker per type
  const audioRef = useRef(null)

  // ── Initialize audio element ──
  useEffect(() => {
    // Create audio context for alert beep (synthesized, no external file needed)
    audioRef.current = {
      play: () => {
        try {
          const ctx = new (window.AudioContext || window.webkitAudioContext)()
          // Beep 1
          const osc1 = ctx.createOscillator()
          const gain1 = ctx.createGain()
          osc1.connect(gain1)
          gain1.connect(ctx.destination)
          osc1.frequency.setValueAtTime(880, ctx.currentTime) // A5
          osc1.type = 'square'
          gain1.gain.setValueAtTime(0.3, ctx.currentTime)
          gain1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15)
          osc1.start(ctx.currentTime)
          osc1.stop(ctx.currentTime + 0.15)

          // Beep 2 (delayed)
          const osc2 = ctx.createOscillator()
          const gain2 = ctx.createGain()
          osc2.connect(gain2)
          gain2.connect(ctx.destination)
          osc2.frequency.setValueAtTime(1100, ctx.currentTime + 0.2) // C#6
          osc2.type = 'square'
          gain2.gain.setValueAtTime(0.3, ctx.currentTime + 0.2)
          gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4)
          osc2.start(ctx.currentTime + 0.2)
          osc2.stop(ctx.currentTime + 0.4)

          // Beep 3 (higher, urgent)
          const osc3 = ctx.createOscillator()
          const gain3 = ctx.createGain()
          osc3.connect(gain3)
          gain3.connect(ctx.destination)
          osc3.frequency.setValueAtTime(1320, ctx.currentTime + 0.45)
          osc3.type = 'square'
          gain3.gain.setValueAtTime(0.35, ctx.currentTime + 0.45)
          gain3.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.65)
          osc3.start(ctx.currentTime + 0.45)
          osc3.stop(ctx.currentTime + 0.65)

          // Auto-close context
          setTimeout(() => ctx.close(), 1000)
        } catch (e) {
          console.warn('Alert sound failed:', e)
        }
      }
    }
  }, [])

  // ── Request notification permission on mount ──
  useEffect(() => {
    if (!('Notification' in window)) return
    setNotifPermission(Notification.permission)

    if (Notification.permission === 'default') {
      // Slight delay so it doesn't fire immediately on page load
      const timer = setTimeout(() => {
        Notification.requestPermission().then((perm) => {
          setNotifPermission(perm)
        })
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [])

  // ── Register service worker ──
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').then((reg) => {
        console.log('ServiceWorker registered:', reg.scope)
      }).catch((err) => {
        console.warn('ServiceWorker registration failed:', err)
      })
    }
  }, [])

  // ── Trigger a single alert ──
  const triggerAlert = useCallback((type, title, body, value) => {
    const now = Date.now()
    const lastTime = lastTriggered.current[type] || 0

    // Debounce: skip if same alert type fired within DEBOUNCE_MS
    if (now - lastTime < DEBOUNCE_MS) return
    lastTriggered.current[type] = now

    const alertObj = {
      id: `${type}-${now}`,
      type,
      title,
      body,
      value,
      timestamp: new Date(),
    }

    // 1. Update active alerts state
    setActiveAlerts((prev) => {
      // Replace if same type exists, otherwise add
      const filtered = prev.filter((a) => a.type !== type)
      return [...filtered, alertObj]
    })

    // 2. Add to history
    setAlertHistory((prev) => [alertObj, ...prev].slice(0, 50))

    // 3. Browser push notification
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        const notif = new Notification(title, {
          body,
          icon: '/icons/alert.png',
          badge: '/icons/icon-192.png',
          vibrate: [200, 100, 200, 100, 200],
          tag: `safetyhub-${type}`,
          renotify: true,
          requireInteraction: true,
        })
        // Auto-close after 10s
        setTimeout(() => notif.close(), 10000)
      } catch {
        // Fallback for mobile: use service worker notification
        if (navigator.serviceWorker?.controller) {
          navigator.serviceWorker.ready.then((reg) => {
            reg.showNotification(title, {
              body,
              icon: '/icons/alert.png',
              badge: '/icons/icon-192.png',
              vibrate: [200, 100, 200, 100, 200],
              tag: `safetyhub-${type}`,
              renotify: true,
            })
          })
        }
      }
    }

    // 4. Mobile vibration
    if ('vibrate' in navigator) {
      navigator.vibrate([200, 100, 200, 100, 200])
    }

    // 5. Play alert sound
    if (audioRef.current) {
      audioRef.current.play()
    }
  }, [])

  // ── Check sensor data against thresholds ──
  const checkAlerts = useCallback((data) => {
    if (!data) return

    const gasValue = data.gasLevel ?? data.gas_level ?? data.gas
    const tempValue = data.temperature
    const seismicValue = data.vibration ?? data.seismic
    const humidityValue = data.humidity

    if (gasValue != null && gasValue > THRESHOLDS.gas.value) {
      triggerAlert(
        'gas',
        `Gas Leak Detected`,
        `Gas level reached ${gasValue} ppm — evacuate the area immediately.`,
        gasValue
      )
    }

    if (tempValue != null && tempValue > THRESHOLDS.temperature.value) {
      triggerAlert(
        'temperature',
        `High Temperature Alert`,
        `Temperature reached ${tempValue.toFixed(1)}°C — potential fire risk.`,
        tempValue
      )
    }

    if (seismicValue != null && seismicValue > THRESHOLDS.seismic.value) {
      triggerAlert(
        'seismic',
        `Seismic Activity Detected`,
        `Magnitude ${seismicValue.toFixed(2)}G detected — seek shelter.`,
        seismicValue
      )
    }

    if (humidityValue != null && humidityValue > THRESHOLDS.humidity.value) {
      triggerAlert(
        'humidity',
        `High Humidity Alert`,
        `Humidity at ${humidityValue.toFixed(1)}% — equipment risk.`,
        humidityValue
      )
    }
  }, [triggerAlert])

  // ── Dismiss a specific alert ──
  const dismissAlert = useCallback((alertId) => {
    setActiveAlerts((prev) => prev.filter((a) => a.id !== alertId))
  }, [])

  // ── Dismiss all alerts ──
  const dismissAllAlerts = useCallback(() => {
    setActiveAlerts([])
  }, [])

  return {
    checkAlerts,
    activeAlerts,
    alertHistory,
    dismissAlert,
    dismissAllAlerts,
    notifPermission,
    triggerAlert,
  }
}
