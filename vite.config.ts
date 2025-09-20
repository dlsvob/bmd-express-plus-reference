// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// import path from 'node:path'; // Only needed if used for other aliases

export default defineConfig({
  plugins: [react()],
  define: {
    'global': 'globalThis', // Minimal global polyfill for Plotly
  },
  resolve: {
    alias: {
      'stream': 'stream-browserify', // Keep stream polyfill for Plotly
    },
  },
  server: {
      host: 'localhost',
      port: 5173,
  },
  build: {
     outDir: 'dist'
   }
});