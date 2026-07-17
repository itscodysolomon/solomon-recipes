import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // Relative base works for GitHub Pages project sites and local preview.
  base: './',
  plugins: [react()],
})
