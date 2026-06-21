/**
 * WHY this file exists:
 *   Vite needs to know how to bundle our React app.
 *   The @ alias lets us write import '@/components/...' instead of
 *   '../../components/...' (relative paths get confusing in nested folders).
 */

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // @ maps to the src/ folder — same as Next.js jsconfig paths
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
});
