import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
 allowedHosts: ['payments.ninex-group.com'],    
port: 3000,
  },
})
