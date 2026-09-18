import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  // 5174 so it can run next to examples/basic on 5173.
  server: { port: 5174, strictPort: true },
})
