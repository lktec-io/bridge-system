import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5789,
  },
  build: {
    // Route-level React.lazy already splits the pages; these groups keep the
    // heavy third-party code in long-lived chunks so an app deploy does not
    // invalidate the browser's copy of Leaflet or React.
    rollupOptions: {
      output: {
        // Rolldown (Vite 8) takes the function form only — the object map
        // silently fails type validation and then throws at chunk naming.
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;

          // react-leaflet contains "react", so match Leaflet first.
          if (id.includes('leaflet'))      return 'vendor-leaflet';
          if (id.includes('date-fns'))     return 'vendor-dates';
          if (id.includes('react-icons'))  return 'vendor-icons';
          if (id.includes('react-router')) return 'vendor-react';
          if (id.includes('react-dom') || id.includes('scheduler')) return 'vendor-react';
          return undefined;
        },
      },
    },
    // The entry chunk should stay well under this; a breach means something
    // heavy leaked back into the initial load.
    chunkSizeWarningLimit: 300,
  },
})
