# Contributing

## Workflow

- **Trunk-based:** short-lived branches off `main` named `<type>/<issue>-<slug>` (e.g. `feat/12-contact-form`).
- Every change goes through a pull request. CI must be green: lint, types, architecture rules, unit, integration,
  E2E, accessibility, budgets and Lighthouse.
- **Squash merge only.** The PR title becomes the commit, so it must follow Conventional Commits:
  `feat(web): add featured accessories carousel`.
  - Types: `feat`, `fix`, `perf`, `refactor`, `test`, `docs`, `build`, `ci`, `chore`, `revert`.
  - Scopes: `web`, `api`, `contracts`, `ui`, `i18n`, `seo`, `catalog`, `challenges`, `coupons`, `identity`, `db`,
    `ci`, `deps`, `repo`.
- Merging to `main` deploys to staging. Production deploys when the release-please PR is merged.

## Code conventions

- TypeScript strict. No `any`. Validate external data (HTTP, env, content, JSON columns) with Zod at the boundary.
- Files in `kebab-case`. Named exports, except where Next.js requires a default export.
- **No hardcoded user-facing text:** copy lives in `apps/web/src/i18n/messages/*.json` (es-MX).
- **No locale segment in public URLs.** Use the `Link` from `@/i18n/navigation`.
- Design tokens only: no hex colors in components.
- Configuration is read only through `business.ts` (web) and `config.ts` (API).
- Expected failures return `Result<T, E>`. The API answers errors with RFC 9457 problem details.
- Dependencies point inward (`domain ← application ← infrastructure/http`). `pnpm lint:deps` enforces this.

## Tests

Test at the lowest level that gives confidence: domain rules as unit tests with in-memory fakes, HTTP and persistence
as integration tests in workerd, and critical journeys as E2E tests. Use synthetic data only, never real customer data.

## Git hooks

`pnpm install` sets up Lefthook: Prettier and ESLint on staged files, and commitlint on commit messages.
