import { next } from '@mundomotos/eslint-config/next';
import { defineConfig } from 'eslint/config';

export default defineConfig(
  {
    ignores: [
      // Vendored from the `anatomy` skill's kit and kept byte-for-byte, so it can be refreshed
      // from upstream without replaying local fixes.
      'src/shared/iso/*.mjs',
      // The engine figure: built outside this app and copied in as its author made it, words
      // and all. Linting it would mean rewriting it. See `shared/iso/README.md`.
      'src/features/landing/figures/engine-4t/',
      // Precomputed geometry: one long line of JSON, written by a build script.
      'src/features/landing/figures/*/art.generated.json',
    ],
  },
  next,
  {
    // A figure carries its own words: the Spanish in a drawing lives in its source, not in the
    // message catalogs, which is the one documented exception to rule 2 in AGENTS.md (see
    // `src/shared/iso/README.md`). Everything else about these files is linted as usual.
    files: ['src/features/landing/figures/**/*.tsx'],
    rules: { 'i18next/no-literal-string': 'off' },
  },
  {
    // The geometry builds run under Node, not in the browser.
    files: ['src/features/landing/figures/**/*.mjs'],
    languageOptions: { globals: { console: 'readonly', process: 'readonly' } },
  },
);
