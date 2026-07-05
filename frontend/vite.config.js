/**
 * Vite config.
 * The @ alias maps to src/. manualChunks splits large third-party libraries
 * into their own long-cacheable vendor chunks so no single chunk is oversized
 * and returning visitors re-download less.
 */
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          motion: ['framer-motion'],
          radix: [
            '@radix-ui/react-dropdown-menu', '@radix-ui/react-dialog', '@radix-ui/react-tooltip',
            '@radix-ui/react-avatar', '@radix-ui/react-switch', '@radix-ui/react-tabs',
            '@radix-ui/react-slot', '@radix-ui/react-progress', '@radix-ui/react-scroll-area',
          ],
          charts: ['recharts'],
        },
      },
    },
  },
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
});
