import nextPlugin from '@next/eslint-plugin-next';
import { defineConfig } from 'eslint/config';
import i18next from 'eslint-plugin-i18next';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

import { base } from './base.js';

export const next = defineConfig(
  base,
  nextPlugin.configs['core-web-vitals'],
  reactHooks.configs.flat['recommended-latest'],
  jsxA11y.flatConfigs.strict,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: { globals: { ...globals.browser } },
    plugins: { i18next },
    rules: {
      // All user-facing copy lives in i18n catalogs (ADR-0008).
      // Only human-readable attributes are checked; hrefs, classNames, ids etc. are code.
      'i18next/no-literal-string': [
        'error',
        {
          mode: 'jsx-only',
          'jsx-attributes': { include: ['alt', 'aria-label', 'title', 'placeholder'] },
        },
      ],
      // Static export: images are pre-optimized at build time and next/image adds client JS for no gain.
      '@next/next/no-img-element': 'off',
      // Colors come from design tokens, never hex literals in components.
      'no-restricted-syntax': [
        'error',
        {
          selector: 'Literal[value=/#[0-9a-fA-F]{3,8}\\b/]',
          message: 'Use design tokens (Tailwind theme / CSS variables) instead of hex colors.',
        },
      ],
    },
  },
  {
    files: ['scripts/**/*.{js,mjs}'],
    languageOptions: { globals: { ...globals.node } },
  },
  {
    files: ['**/*.test.{ts,tsx}', '**/e2e/**'],
    rules: { 'i18next/no-literal-string': 'off' },
  },
);
