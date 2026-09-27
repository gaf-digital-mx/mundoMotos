import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import prettier from 'eslint-config-prettier';
import { createTypeScriptImportResolver } from 'eslint-import-resolver-typescript';
import { flatConfigs as importX } from 'eslint-plugin-import-x';
import tseslint from 'typescript-eslint';

/** Files where Next.js, tooling or test runners require default exports. */
const DEFAULT_EXPORT_FILES = [
  '**/*.config.{js,mjs,cjs,ts,mts}',
  '**/app/**/{page,layout,not-found,global-not-found,error,global-error,loading,template,default}.tsx',
  '**/app/**/{robots,sitemap,manifest}.ts',
  '**/i18n/request.ts',
  '**/src/index.ts',
];

/** The only modules allowed to read environment variables (ADR-0016). */
const CONFIG_FILES = [
  '**/*.config.{js,mjs,cjs,ts,mts}',
  '**/business.ts',
  '**/config.ts',
  // Test runners read their own switches (BASE_URL, CI) from the environment.
  '**/e2e/**',
];

export const base = defineConfig(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/out/**',
      '**/.next/**',
      '**/.turbo/**',
      '**/.wrangler/**',
      '**/coverage/**',
      '**/playwright-report/**',
      '**/test-results/**',
      '**/test/fixtures/**',
      '**/worker-configuration.d.ts',
      '**/next-env.d.ts',
    ],
  },
  js.configs.recommended,
  tseslint.configs.strictTypeChecked,
  tseslint.configs.stylisticTypeChecked,
  importX.recommended,
  importX.typescript,
  {
    languageOptions: {
      parserOptions: { projectService: true },
    },
    settings: {
      'import-x/resolver-next': [createTypeScriptImportResolver({ alwaysTryTypes: true })],
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/consistent-type-definitions': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
      'import-x/no-default-export': 'error',
      'import-x/no-duplicates': 'error',
      // Runtime-provided modules (workerd) have no files on disk.
      'import-x/no-unresolved': ['error', { ignore: ['^cloudflare:'] }],
      // Noisy with CJS/ESM interop packages (typescript-eslint, next); TypeScript already validates members.
      'import-x/no-named-as-default-member': 'off',
      'import-x/no-named-as-default': 'off',
      'import-x/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', ['parent', 'sibling', 'index'], 'type'],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
      'no-restricted-properties': [
        'error',
        {
          object: 'process',
          property: 'env',
          message:
            'Read configuration only through business.ts (web) or config.ts (API). See ADR-0016.',
        },
      ],
    },
  },
  { files: DEFAULT_EXPORT_FILES, rules: { 'import-x/no-default-export': 'off' } },
  { files: CONFIG_FILES, rules: { 'no-restricted-properties': 'off' } },
  { files: ['**/*.{js,mjs,cjs}'], extends: [tseslint.configs.disableTypeChecked] },
  prettier,
);
