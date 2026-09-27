/**
 * Architecture rules (ADR-0004, ADR-0005). Violations fail CI.
 * @type {import('dependency-cruiser').IConfiguration}
 */
module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      severity: 'error',
      comment: 'Circular dependencies make modules impossible to reason about in isolation.',
      from: {},
      to: { circular: true },
    },
    {
      name: 'domain-is-pure',
      severity: 'error',
      comment: 'Domain code depends only on the shared kernel and its own module domain.',
      from: { path: '^apps/api/src/modules/([^/]+)/domain/' },
      to: {
        pathNot: ['^apps/api/src/shared/kernel/', '^apps/api/src/modules/$1/domain/'],
      },
    },
    {
      name: 'application-has-no-infrastructure',
      severity: 'error',
      comment: 'Use cases talk to ports, never to adapters, frameworks or the database.',
      from: { path: '^apps/api/src/modules/[^/]+/application/' },
      to: {
        path: [
          '^apps/api/src/modules/[^/]+/(infrastructure|http)/',
          '(^|/)node_modules/(hono|drizzle-orm|better-auth)/',
        ],
      },
    },
    {
      name: 'modules-talk-through-public-api',
      severity: 'error',
      comment: "A module may only import another module's index.ts.",
      from: { path: '^apps/api/src/modules/([^/]+)/' },
      to: {
        path: '^apps/api/src/modules/[^/]+/',
        pathNot: ['^apps/api/src/modules/$1/', '^apps/api/src/modules/[^/]+/index\\.ts$'],
      },
    },
    {
      name: 'web-does-not-import-api',
      severity: 'error',
      comment: 'The web app and the API share shapes only through @mundomotos/contracts.',
      from: { path: '^apps/web/' },
      to: { path: '^apps/api/' },
    },
    {
      name: 'contracts-are-leaf',
      severity: 'error',
      comment: 'Contracts are consumed by apps and never depend on them.',
      from: { path: '^packages/contracts/' },
      to: { path: '^apps/' },
    },
    {
      name: 'no-dev-deps-in-production-code',
      severity: 'error',
      comment: 'Runtime code must not rely on devDependencies.',
      from: {
        path: '^(apps|packages)/[^/]+/src/',
        pathNot: ['\\.test\\.tsx?$', '/src/test/'],
      },
      to: { dependencyTypes: ['npm-dev'], dependencyTypesNot: ['type-only'] },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    // Anchored to our own packages: an unanchored `dist/` would also drop node_modules/*/dist deps.
    exclude: {
      path: [
        '^(apps|packages)/[^/]+/(out|dist|\\.next|\\.turbo|\\.wrangler|coverage)/',
        '/test/fixtures/',
      ],
    },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: 'tsconfig.depcruise.json' },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default', 'types'],
      extensions: ['.ts', '.tsx', '.js', '.mjs', '.cjs', '.json'],
    },
  },
};
