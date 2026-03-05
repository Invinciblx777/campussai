import { createClient } from '@supabase/supabase-js'

// Supabase credentials — set these in your .env file (Vite reads VITE_ prefixed vars)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

let supabase = null

if (supabaseUrl && supabaseKey && !supabaseUrl.includes('your-project')) {
    supabase = createClient(supabaseUrl, supabaseKey)
}

export default supabase
