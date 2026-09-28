import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const API_TARGET = 'http://localhost:5000';

/**
 * Proxying `/api` and `/uploads` keeps the browser same-origin in development,
 * so the httpOnly auth cookie is sent without any CORS or SameSite problems.
 *
 * `preview` needs its own copy: Vite only applies `server.proxy` to the dev
 * server, so without this the production build would 404 every API call.
 */
const proxy = {
  '/api': { target: API_TARGET, changeOrigin: true },
  '/uploads': { target: API_TARGET, changeOrigin: true },
};

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy,
  },
  preview: {
    port: 4173,
    proxy,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
