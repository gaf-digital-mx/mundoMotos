# Vendored: the `anatomy` isometric drawing kit

Third-party code, copied in rather than installed: it is published as an agent skill, not as an
npm package, and only the service figures use it.

|          |                                                                                                                                                                 |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Upstream | `anatomy` skill — https://github.com/anthropics/skills                                                                                                          |
| Version  | copied 2026-10-22, from a working copy past its 1.1.0 release (2026-10-12) — the kit carries no version of its own, so a refresh means diffing against upstream |
| Licence  | MIT — Copyright (c) 2026 Ryan. See `LICENSE` beside this file.                                                                                                  |

## What is here

| File          | Upstream path     | Used by                                                  |
| ------------- | ----------------- | -------------------------------------------------------- |
| `iso-kit.mjs` | `kit/iso-kit.mjs` | the camera, the solids and the SVG writer                |
| `iso-kit.ts`  | `kit/iso-kit.ts`  | the same core in TypeScript, for a figure written in it  |
| `react/`      | `kit/react/`      | the server-safe drawing components and the live hooks    |
| `lathe.mjs`   | `kit/lathe.mjs`   | the round parts: bores, flanges, valves, springs         |
| `tube.mjs`    | `kit/tube.mjs`    | the pipes and the plug lead (geometry build only)        |
| `gl.mjs`      | `kit/gl.mjs`      | the WebGL layer the gas, flame and exhaust are drawn on  |
| `audit.mjs`   | `kit/audit.mjs`   | proving a figure's geometry at build time; never shipped |
| `iso.css`     | `kit/iso.css`     | the card, the four tones and the line styles             |

Every one of them is byte-for-byte upstream but for the `@ts-nocheck` banner on the TypeScript
files, so a refresh is a straight copy. (`react/draw.tsx` is the exception: it carries a one-line
change from the project the `tires` figure was built in, which makes its `fig` optional so a
figure can leave out the figure number.) They are excluded
from ESLint (`apps/web/eslint.config.js`) and from Prettier (`.prettierignore`) to keep it that
way.

## Local additions

`gl.d.mts` is ours, not upstream: the kit ships `gl.mjs` without types and this project's
TypeScript runs with `allowJs: false`, so the figure's client code needs a declaration to import
`glLayer` and `settle`. Keep it in step with `gl.mjs` on a refresh.

The TypeScript files the kit ships (`iso-kit.ts`, `react/`) carry a `@ts-nocheck` banner, as the
copied figures do: they predate this project's `noUncheckedIndexedAccess` and
`exactOptionalPropertyTypes`, and patching them would make every refresh a merge instead of a
copy.

## How a figure uses it

A figure lives in `features/landing/figures/<name>/`, is fetched the first time its dialog opens,
and comes from one of two places.

**Built here, against this kit** (`brakes`): geometry precomputed by its own `build.mjs`, which
also proves itself — `node build.mjs --audit` ray-casts the recorded shapes and must end
`audit passed`, with every line at zero: nothing passing through anything at rest, apart or in
any replayed frame of the explode, every part standing on another, every pipe end on its mount,
and every overlap drawn in true depth order. These figures are linted and formatted like the
rest of the app.

**Built outside it and copied in** (`engine-4t`, `tires`): as its author made it, geometry,
styles, words and all. The edits on the way in are the import paths, an `iso.css` import (its
home page loaded the kit's stylesheet from the app layout; here the figure is fetched on demand,
so it carries it), and whatever it takes to wear this project's card: the dark theme, no figure
number, no caption, action controls in the plate and numbered part chips under it. `tires` came
with its own card, its own numbered step list and a light default, so those were replaced, and
its root stopped being an ARIA slider once it held real buttons; its drawing, its model and its
shader are untouched.

Beyond those, `engine-4t` carries local changes this site needed. Reapply them on a refresh:

- The caption under the parts row (its `CAPTION` constant and the `iso-caption` span) is gone —
  the dialog already carries the copy that sells the service, so the figure shows the engine and
  says nothing. The SVG's `aria-label` stays: it is the only description of the drawing for
  someone who cannot see it.
- `aria-valuetext` is gone from the stage, in `figure.tsx` and in `live.tsx`: the attribute is
  not allowed on `role="group"`, so no screen reader ever read it (axe calls it critical), and
  the state is already announced through the figure's own live region.
- `engine.css` raises `--anatomy-muted` to the site's ash in the dark theme. The kit's own grey
  reaches 3.6:1 on this card, and the corners, the readout and the part chips are written in it,
  so the dialog failed 1.4.3.

The last two are what the dialog's axe test checks, and that test waits for the figure's chunk
before it looks — otherwise whether the figure is audited at all depends on the machine.

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
