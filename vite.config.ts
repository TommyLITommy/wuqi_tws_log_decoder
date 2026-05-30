import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path' // 新增这行

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // Default 5173 is in Windows excluded range 5159–5258 (Hyper-V/WSL)
  server: {
    host: '127.0.0.1',
    port: 3000,
  },
})