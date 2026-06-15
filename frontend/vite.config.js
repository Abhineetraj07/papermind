import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/auth': { target: 'http://localhost', changeOrigin: true },
      '/query': { target: 'http://localhost', changeOrigin: true },
      '/documents': { target: 'http://localhost', changeOrigin: true },
      '/ingest': { target: 'http://localhost', changeOrigin: true },
      '/sessions': { target: 'http://localhost', changeOrigin: true },
      '/graph': { target: 'http://localhost', changeOrigin: true },
      '/health': { target: 'http://localhost', changeOrigin: true },
    },
  },
  build: { outDir: 'dist' },
})
