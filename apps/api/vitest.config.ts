import { defineConfig } from 'vitest/config';

/**
 * Unit tests: pure TypeScript in Node (domain, use cases, kernel, routing rules).
 * Coverage gates apply to that pure code. HTTP adapters and the site handler are verified by the
 * integration suite inside workerd (vitest.integration.config.ts), where V8 coverage isn't available.
 */
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: [
        'src/modules/*/domain/**/*.ts',
        'src/modules/*/application/**/*.ts',
        'src/shared/kernel/**/*.ts',
        'src/edge/locale-routing.ts',
      ],
      exclude: ['src/**/*.test.ts', 'src/**/index.ts'],
      thresholds: {
        lines: 90,
        branches: 85,
        'src/modules/*/domain/**': { lines: 95, branches: 90 },
        'src/modules/*/application/**': { lines: 90, branches: 85 },
      },
    },
  },
});
