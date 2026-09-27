import { cloudflareTest } from '@cloudflare/vitest-pool-workers';
import { defineConfig } from 'vitest/config';

/** Integration tests: the real Worker in workerd, with fixture assets and test vars. */
export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: './test/wrangler.test.jsonc' },
      miniflare: {
        bindings: {
          SITE_URL: 'https://mundomotos.test',
          SITE_INDEXABLE: 'false',
          BUSINESS_WHATSAPP_NUMBER: '525500000000',
          BUSINESS_FACEBOOK_URL: 'https://www.facebook.com/',
          APP_VERSION: 'test',
        },
      },
    }),
  ],
  test: {
    include: ['test/**/*.test.ts'],
  },
});
