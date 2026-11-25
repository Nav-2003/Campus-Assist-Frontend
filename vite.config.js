import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Vite's proxy runs on the same EC2 host as the backend in this deployment.
// Use loopback for this server-to-server hop; browser production URLs remain
// configured separately through VITE_API_BASE_URL.
const apiTarget = process.env.CAMPUS_ASSIST_API_TARGET || 'http://127.0.0.1:3000'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: [
      'localservices.publicvm.com',
      'www.localservices.publicvm.com',
    ],
    proxy: {
      '/api': {
        target: apiTarget,
        changeOrigin: true,
      },
      '/socket.io': {
        target: apiTarget,
        ws: true,
        changeOrigin: true,
      },
    },
  },
})
