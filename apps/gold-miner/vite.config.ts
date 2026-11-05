import { fileURLToPath, URL } from 'node:url';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: './',
  // the route generator isn't needed for unit tests
  plugins: [process.env.VITEST ? null : tanstackRouter({ target: 'react', autoCodeSplitting: true }), react()],
  // "localhost" resolves to IPv6 ::1 only on some Windows setups, so anything opening 127.0.0.1 failed to connect
  server: { host: '127.0.0.1', port: 5173 },
  preview: { host: '127.0.0.1', port: 4173 },
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
  },
});
