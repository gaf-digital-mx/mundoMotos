# AGENTS.md

Guidance for AI coding agents (and humans) working in this repository.

## Project

Website for Mundo Motos, a motorcycle parts store and repair shop in Mexico. It is a **lead-generation site, not a
store**: no cart, payments or shipping. Calls to action send visitors to WhatsApp or the physical store. Later phases
add a product catalog with an admin panel, and gamified challenges that award QR coupons.

It runs entirely on Cloudflare's free tier. **Don't add paid services, or services whose free tier forbids commercial use.**

## Commands

Node 24 (`.nvmrc`), pnpm via Corepack (`corepack enable`).

```bash
pnpm install
pnpm lint            # ESLint across packages
pnpm lint:deps       # architecture rules (dependency-cruiser)
pnpm typecheck
pnpm test            # unit + component
pnpm test:coverage   # with enforced thresholds
pnpm test:integration  # API tests inside workerd
pnpm build           # static export + Worker bundle dry run
pnpm check:budgets   # Worker size + landing-page JS budgets
pnpm test:e2e        # Playwright + axe against the real Worker (run after build)
pnpm format          # Prettier
```

Run `pnpm lint && pnpm typecheck && pnpm test` before proposing a change. Run the E2E suite when you touch routing, pages
or the Worker.

## Structure

```text
apps/web/            Next.js 16 App Router, `output: 'export'` (fully static)
  src/app/[locale]/  routes (locale is an internal build segment only)
  src/features/      feature modules (UI, hooks, local helpers)
  src/i18n/          next-intl config + messages/<locale>.json
  src/shared/        cross-feature UI and libs; config/business.ts reads site config
apps/api/            Cloudflare Worker (Hono): /api/* + serves the static export
  src/edge/          locale-aware static site serving
  src/modules/       business modules by capability
  src/shared/kernel/ Result, Clock, IdGenerator, DomainError
  src/config.ts      the only place the API reads env vars
packages/contracts/  Zod schemas + types shared by web and API (their only coupling)
packages/eslint-config, packages/tsconfig   shared presets
```

## Non-negotiable rules

1. **Never put a locale in a public URL** (no `/es/...`, `/en/...`). The build emits one tree per locale. The Worker serves
   the right one based on the `lang` cookie (Spanish by default) and 301s prefixed paths to clean ones. Use `Link` from
   `@/i18n/navigation`.
2. **No hardcoded user-facing text.** All copy goes in `apps/web/src/i18n/messages/*.json`, written in Mexican Spanish (es-MX).
   ESLint enforces this in JSX.
3. **No hardcoded business or site data.** WhatsApp/phone numbers, the Facebook URL, `SITE_URL` and `SITE_INDEXABLE` come from
   environment variables, validated with Zod, and are read **only** through `apps/web/src/shared/config/business.ts` and
   `apps/api/src/config.ts`. Example env files use placeholders, never real values.
4. **Public repository:** never commit secrets, personal data, real customer data, challenge answer keys or database dumps,
   and never upload them as CI artifacts. Fixtures use synthetic data only.
5. **Design tokens only.** No hex colors in components. Use the Tailwind theme in `apps/web/src/app/globals.css`.
6. **Static first.** Pages are pre-rendered at build time. Client components (`'use client'`) only for interactive
   islands; they receive translated strings as props (there is no client-side i18n provider).
7. **Free-tier limits:** the Worker has a 10 ms CPU budget per request and a 3 MiB script limit. Keep API work I/O-bound.
   No password hashing (auth is Google OAuth only).

## Architecture

- Modular monolith in the API. **Clean architecture only where business rules live** (coupons, challenges):
  `domain → application (use cases + ports) → infrastructure / http`. CRUD modules stay thin.
- Dependencies point inward. `domain` imports only `shared/kernel`. `application` never imports adapters, `hono` or
  `drizzle-orm`. Modules talk through their `index.ts`. `apps/web` never imports `apps/api`. `pnpm lint:deps` enforces this.
- Use cases are factory functions receiving their ports: `makeRedeemCoupon({ coupons, clock })`.
- Expected failures return `Result<T, E>`. HTTP errors are RFC 9457 problem details (`application/problem+json`).
- Validate every external input (HTTP, env, content files, JSON columns) with Zod at the boundary.

## Code style

- Everything in English: code, comments, commits, PRs. Only user-facing copy is in Spanish.
- TypeScript strict (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`). No `any`.
- Files in `kebab-case`. Named exports, except where Next.js requires a default export.
- Comments explain _why_, not _what_.

## Testing

- Unit tests next to the code (`*.test.ts`). API integration tests in `apps/api/test/` run inside workerd. E2E tests in
  `apps/web/e2e/`.
- Prefer in-memory fakes over mocks. Inject time and IDs through the `Clock`/`IdGenerator` ports.
- Coverage thresholds are enforced on pure code (domain, use cases, kernel, routing rules).

## Git workflow

- Trunk-based, with short-lived branches named `<type>/<slug>`. Every change goes through a PR into `main`, merged with **squash only**.
- The PR title becomes the commit and must follow Conventional Commits:
  `type(scope): summary`. Types: `feat fix perf refactor test docs build ci chore revert`. Scopes:
  `web api contracts ui i18n seo catalog challenges coupons identity db ci deps repo`.
- Merging to `main` deploys staging. release-please opens release PRs, and merging one deploys production.
