// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  define: {
    'global': 'globalThis', // Minimal global polyfill for Plotly
    'process.env.NODE_DEBUG': 'undefined', // Disable Node.js debugging in browser
    'process.pid': '0', // Stub process.pid for util.debuglog
  },
  resolve: {
    alias: {
      'stream': 'stream-browserify', // Keep stream polyfill for Plotly
      'util': path.resolve('./src/polyfills/util-browser.js'), // Custom browser-compatible util
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