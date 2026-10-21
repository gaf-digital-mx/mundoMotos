# Vendored: the `anatomy` isometric drawing kit

Third-party code, copied in rather than installed: it is published as an agent skill, not as an
npm package, and only the service figures use it.

|          |                                                                                                                                                                 |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Upstream | `anatomy` skill — https://github.com/anthropics/skills                                                                                                          |
| Version  | copied 2026-10-21, from a working copy past its 1.1.0 release (2026-10-12) — the kit carries no version of its own, so a refresh means diffing against upstream |
| Licence  | MIT — Copyright (c) 2026 Ryan. See `LICENSE` beside this file.                                                                                                  |

## What is here

| File             | Upstream path        |
| ---------------- | -------------------- |
| `iso-kit.ts`     | `kit/iso-kit.ts`     |
| `iso.css`        | `kit/iso.css`        |
| `react/draw.tsx` | `kit/react/draw.tsx` |
| `react/live.tsx` | `kit/react/live.tsx` |

## Local changes, to replay on a refresh

1. `iso-kit.ts` carries a `@ts-nocheck` banner at the top. The kit predates this project's
   `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`; patching some 200 index reads
   would turn every future refresh into a merge. Its exported types are unaffected, so callers
   are still fully typed.
2. `react/draw.tsx` line 2: the import path was rewritten from `../../kit/iso-kit` to
   `../iso-kit`.

Nothing else is edited. These files are excluded from ESLint (`apps/web/eslint.config.js`) and
from Prettier (`.prettierignore`) so a refresh stays a straight copy.

The kit's palette is a set of `--anatomy-*` custom properties, which
`features/landing/figures/tune-up/tune-up.css` re-points at this project's design tokens. Don't
edit the colours here.
