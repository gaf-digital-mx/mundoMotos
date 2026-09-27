import { defineConfig } from 'eslint/config';
import globals from 'globals';

import { base } from '@mundomotos/eslint-config/base';

/** Root-level tooling files only; each app/package has its own eslint.config.js. */
export default defineConfig({ ignores: ['apps/**', 'packages/**'] }, base, {
  files: ['scripts/**', '*.{js,cjs,mjs}'],
  languageOptions: { globals: globals.node },
});
