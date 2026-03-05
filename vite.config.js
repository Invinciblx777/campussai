import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Direct to ESP32 (when laptop is on ESP32 WiFi)
      '/api/data': {
        target: 'http://192.168.4.1',
        changeOrigin: true,
      },
      // Through Python gateway (alternative path)
      '/gateway': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/gateway/, ''),
      },
    }
  }
})
