import { next } from '@mundomotos/eslint-config/next';
import { defineConfig } from 'eslint/config';

export default defineConfig(
  {
    ignores: [
      // Vendored from the `anatomy` skill's kit and kept byte-for-byte, so it can be refreshed
      // from upstream without replaying local fixes.
      'src/shared/iso/*.mjs',
      // The service figures: drawings built outside this app and copied in as their author made
      // them, words and all. Linting them would mean rewriting them. See `shared/iso/README.md`.
      'src/features/landing/figures/*/',
    ],
  },
  next,
);
