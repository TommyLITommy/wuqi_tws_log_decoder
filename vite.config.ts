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
  // Avoid Windows Hyper-V/WSL reserved ranges (e.g. 2915–3014, 5159–5258)
  server: {
    host: '127.0.0.1',
    port: 8080,
  },
})