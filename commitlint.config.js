/** Conventional Commits; drives release-please versioning (ADR-0015). */
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-enum': [
      2,
      'always',
      [
        'web',
        'api',
        'contracts',
        'ui',
        'i18n',
        'seo',
        'catalog',
        'challenges',
        'coupons',
        'identity',
        'db',
        'ci',
        'deps',
        // Dependabot scopes development-dependency updates as `deps-dev`.
        'deps-dev',
        'repo',
      ],
    ],
    'subject-case': [2, 'never', ['upper-case', 'pascal-case', 'start-case']],
    'body-max-line-length': [1, 'always', 100],
  },
};
