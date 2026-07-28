// TEMP dev-only config — same plugins/proxy as vite.config.ts, minus the
// `test` block whose @storybook/addon-vitest + @vitest/browser-playwright
// imports are not installed in this checkout (they break `npm run dev`).
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  optimizeDeps: { include: ['xlsx'] },
  server: {
    port: 5183,
    proxy: {
      '/api': { target: 'http://localhost:8080', changeOrigin: true },
      '^/p/': { target: 'http://localhost:8080', changeOrigin: true },
      '/ws':  { target: 'ws://localhost:8080', changeOrigin: true, ws: true },
    },
  },
});
