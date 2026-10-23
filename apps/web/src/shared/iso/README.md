# Vendored: the `anatomy` isometric drawing kit

Third-party code, copied in rather than installed: it is published as an agent skill, not as an
npm package, and only the service figures use it.

|          |                                                                                                                                                                 |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Upstream | `anatomy` skill — https://github.com/anthropics/skills                                                                                                          |
| Version  | copied 2026-10-22, from a working copy past its 1.1.0 release (2026-10-12) — the kit carries no version of its own, so a refresh means diffing against upstream |
| Licence  | MIT — Copyright (c) 2026 Ryan. See `LICENSE` beside this file.                                                                                                  |

## What is here

| File          | Upstream path     | Used by                                                 |
| ------------- | ----------------- | ------------------------------------------------------- |
| `iso-kit.mjs` | `kit/iso-kit.mjs` | the camera, the solids and the SVG writer               |
| `lathe.mjs`   | `kit/lathe.mjs`   | the round parts: bores, flanges, valves, springs        |
| `tube.mjs`    | `kit/tube.mjs`    | the pipes and the plug lead (geometry build only)       |
| `gl.mjs`      | `kit/gl.mjs`      | the WebGL layer the gas, flame and exhaust are drawn on |
| `iso.css`     | `kit/iso.css`     | the card, the four tones and the line styles            |

Every one of them is byte-for-byte upstream, so a refresh is a straight copy. They are excluded
from ESLint (`apps/web/eslint.config.js`) and from Prettier (`.prettierignore`) to keep it that
way.

## Local additions

`gl.d.mts` is ours, not upstream: the kit ships `gl.mjs` without types and this project's
TypeScript runs with `allowJs: false`, so the figure's client code needs a declaration to import
`glLayer` and `settle`. Keep it in step with `gl.mjs` on a refresh.

## How a figure uses it

A figure is not written in this app. It is built outside it, against this kit, and copied into
`features/landing/figures/<name>/` as its author made it — geometry, styles, words and all. The
only edits on the way in are the import paths, an `iso.css` import (its home page loaded the
kit's stylesheet from the app layout; here the figure is fetched on demand, so it carries it),
and the wrapper that picks the theme.

That is why those folders are excluded from ESLint (`apps/web/eslint.config.js`) and from
Prettier (`.prettierignore`), and why `live.tsx` carries a `@ts-nocheck` banner: a figure
predates this project's `noUncheckedIndexedAccess`, and rewriting it would make every refresh a
merge instead of a copy. Each folder's `*.d.mts` files are ours, not the figure's: this project
runs TypeScript with `allowJs: false`, so the `.tsx` side needs declarations to import from the
`.mjs` modules beside it.

**This means a figure's Spanish copy lives in its own source, not in
`src/i18n/messages/es.json`** — the one place in `apps/web` where that is true, and a deliberate
exception to rule 2 in `AGENTS.md`. Translating a figure means going back to where it was built.

The geometry is precomputed under Node — `pnpm figure:engine` runs
`features/landing/figures/engine-4t/build.mjs`, which draws every static part with the modules
above and writes `art.generated.json`. The browser receives that finished SVG, so almost none of
the drawing code reaches a visitor: `gl.mjs` ships whole, because the shader needs it at run
time, and the figure's own moving parts (the rod, the counterweight, the valve springs) are
rebuilt per frame from `lathe.mjs`, so a tree-shaken slice of it and of `iso-kit.mjs` ships too.
The rest — every static path, which is the bulk of it — stays on the build machine.

`art.generated.json` is committed even though a script writes it: `figure.tsx` imports it, so
`pnpm typecheck` and `pnpm lint` need it to exist in a fresh clone. The build is deterministic,
so rerunning it without changing the geometry leaves the file byte-identical.

The kit is dark by default and `data-theme="light"` switches it; the figure's wrapper asks for
dark, which is the only theme this site has. The palette is the kit's own.
