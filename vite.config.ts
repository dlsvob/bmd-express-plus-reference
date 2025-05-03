// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// import path from 'node:path'; // Only needed if used for other aliases

export default defineConfig({
  // --- Set base to use the custom 'app://' protocol ---
  base: 'app://./', // <<< CHANGE THIS
  // ----------------------------------------------------

  plugins: [react()],
  define: {
    'global': 'window', // Keep the global polyfill for Plotly dependencies
  },
  resolve: {
    alias: {
      // Keep the stream polyfill
      'stream': 'stream-browserify',
      // Add 'assert': 'assert/' if the build shows warnings/errors for it
    },
  },
  server: {
      host: 'localhost',
      port: 5173, // Ensure this matches your setup
  },
  // optimizeDeps might be needed if you encounter issues with the aliases
  // or the global define during dependency pre-bundling
  optimizeDeps: {
     esbuildOptions: {
       define: {
         global: 'globalThis'
       },
       // plugins: [ ... Node polyfill plugins if needed ... ]
     },
   },
   build: {
     outDir: 'dist' // Ensure Vite builds to the 'dist' folder
   }
  // ... rest of your Vite config if any ...
});