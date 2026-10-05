import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: './',
  build: {
    // Static site folder next to other PM apps (not gitignored like dist/)
    outDir: '../wel-bekennen',
    emptyOutDir: true,
  },
  test: {
    environment: 'node',
  },
})
