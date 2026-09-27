import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // `server-only` throws outside React Server Components; tests run modules directly.
      'server-only': fileURLToPath(new URL('./src/test/empty-module.ts', import.meta.url)),
    },
  },
  test: {
    environment: 'happy-dom',
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/shared/lib/**', 'src/i18n/**'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/**/*.d.ts'],
    },
  },
});
