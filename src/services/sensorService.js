import axios from 'axios'
import supabase from './supabaseClient'

// ── ESP32 Direct (via Vite proxy → 192.168.4.1) ────────────
const ESP32_URL = '/api/data'

/**
 * Fetch live sensor data directly from the ESP32.
 * Throws if the ESP32 is unreachable or returns unexpected data.
 */
export async function fetchSensorData() {
  const res = await axios.get(ESP32_URL, { timeout: 3000 })
  const data = res.data

  if (
    data.temperature === undefined ||
    data.humidity === undefined ||
    data.gasLevel === undefined ||
    data.vibration === undefined
  ) {
    throw new Error('Unexpected response format from ESP32')
  }

  return data
}

// ── Supabase Cloud (for when laptop has internet) ───────────

/**
 * Fetch the latest sensor reading from Supabase.
 * Returns null if Supabase is not configured or query fails.
 */
export async function fetchFromSupabase() {
  if (!supabase) return null

  try {
    const { data, error } = await supabase
      .from('sensor_data')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) throw error
    if (!data) return null  // table is empty

    // Map Supabase column names to the format the dashboard expects
    return {
      temperature: data.temperature,
      humidity: data.humidity,
      gasLevel: data.gas_level,
      vibration: data.vibration,
      alert: data.alert || 'System Normal',
      device_id: data.device_id,
      timestamp: data.created_at,
    }
  } catch {
    return null
  }
}

/**
 * Fetch recent sensor readings from Supabase (for charts/history).
 * Returns empty array if Supabase is not configured.
 */
export async function fetchHistoryFromSupabase(limit = 20) {
  if (!supabase) return []

  try {
    const { data, error } = await supabase
      .from('sensor_data')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error

    return data.map(row => ({
      temperature: row.temperature,
      humidity: row.humidity,
      gasLevel: row.gas_level,
      vibration: row.vibration,
      alert: row.alert || 'System Normal',
      device_id: row.device_id,
      time: new Date(row.created_at).toLocaleTimeString('en-US', {
        hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit',
      }),
    })).reverse()  // oldest first for charts
  } catch {
    return []
  }
}
