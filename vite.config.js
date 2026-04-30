import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  // tailwindcss() must come AFTER react() for HMR to work cleanly.
  // Tailwind v4 picks up @theme tokens from index.css and generates
  // utility classes on demand — no tailwind.config.js needed for basic use.
  plugins: [react(), tailwindcss()],
})
