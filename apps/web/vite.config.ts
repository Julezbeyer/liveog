import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Served from https://julezbeyer.github.io/liveog/ by the Pages workflow.
// The same base is used in dev and preview so asset URLs behave identically:
// pnpm dev:web -> http://localhost:5174/liveog/
export default defineConfig({
  base: '/liveog/',
  plugins: [react()],
  server: { port: 5174, strictPort: true },
})
