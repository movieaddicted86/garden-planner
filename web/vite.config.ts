import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    // `@garden-planner/shared` ships compiled `dist` for the server and Docker; the web app reads its
    // sources directly, so dev/HMR needs no watch build.
    alias: {
      '@garden-planner/shared': fileURLToPath(new URL('../shared/src/index.ts', import.meta.url)),
    },
  },
  build: { outDir: 'dist' },
  server: {
    port: 5173,
    proxy: { '/api': { target: 'http://localhost:8080', changeOrigin: true } },
  },
});
