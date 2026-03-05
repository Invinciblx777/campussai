import { useState, useEffect, useRef, useCallback } from 'react'
import { fetchSensorData, fetchFromSupabase, fetchHistoryFromSupabase } from '../services/sensorService'

const MAX_POINTS = 20
const POLL_INTERVAL = 2000

/**
 * Data source priority:
 *   1. Try Supabase first (cloud data from the gateway pipeline)
 *   2. Fall back to ESP32 direct (local WiFi connection)
 *   3. If both fail → show offline status
 */
export default function useSensorData() {
  const [current, setCurrent] = useState(null)
  const [history, setHistory] = useState([])
  const [status, setStatus] = useState('connecting') // connecting | online | offline
  const [lastUpdated, setLastUpdated] = useState(null)
  const [alertActive, setAlertActive] = useState(false)
  const [error, setError] = useState(null)
  const [dataSource, setDataSource] = useState('connecting') // supabase | esp32 | offline
  const intervalRef = useRef(null)

  const poll = useCallback(async () => {
    // ── Try Supabase first ──
    try {
      const supaData = await fetchFromSupabase()
      if (supaData) {
        const ts = new Date()
        setCurrent(supaData)
        setLastUpdated(ts)
        setStatus('online')
        setDataSource('supabase')
        setAlertActive(supaData.alert !== 'System Normal')
        setError(null)

        // Fetch history from Supabase for charts
        const histData = await fetchHistoryFromSupabase(MAX_POINTS)
        if (histData.length > 0) {
          setHistory(histData)
          return // Supabase worked — done
        }
      }
    } catch {
      // Supabase failed — fall through to ESP32
    }

    // ── Fall back to ESP32 direct ──
    try {
      const data = await fetchSensorData()
      const ts = new Date()

      setCurrent(data)
      setLastUpdated(ts)
      setStatus('online')
      setDataSource('esp32')
      setAlertActive(data.alert !== 'System Normal')
      setError(null)

      setHistory(prev => {
        const entry = {
          ...data,
          time: ts.toLocaleTimeString('en-US', {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          }),
        }
        const next = [...prev, entry]
        return next.length > MAX_POINTS ? next.slice(next.length - MAX_POINTS) : next
      })
    } catch {
      setStatus('offline')
      setDataSource('offline')
      setError('Cannot reach Supabase or ESP32 — check connections')
    }
  }, [])

  useEffect(() => {
    poll()
    intervalRef.current = setInterval(poll, POLL_INTERVAL)
    return () => clearInterval(intervalRef.current)
  }, [poll])

  return { current, history, status, lastUpdated, alertActive, error, dataSource }
}
