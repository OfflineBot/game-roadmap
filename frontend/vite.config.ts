import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The proxy target differs between docker compose and a bare `npm run dev`.
const backend = process.env.VITE_BACKEND_URL ?? 'http://localhost:8080'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    proxy: { '/api': backend },
  },
})
