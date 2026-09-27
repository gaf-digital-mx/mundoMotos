#!/usr/bin/env node
/**
 * Enforces size budgets after `pnpm build` (docs: architecture §11.3, ci-cd.md):
 *  - Worker script ≤ 2.5 MiB gzip (headroom under the 3 MiB Workers Free limit).
 *  - JavaScript loaded by the landing page ≤ 190 KiB gzip. The Next.js 16 + React 19 baseline measured
 *    168.6 KiB in Phase 0, leaving ~20 KiB for Phase 1 islands (hero canvas, contact form).
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const KiB = 1024;
const budgets = { workerGzip: 2.5 * KiB * KiB, landingJsGzip: 190 * KiB };

const gzipSize = (path) => gzipSync(readFileSync(path), { level: 9 }).length;
const fmt = (bytes) => `${(bytes / KiB).toFixed(1)} KiB`;
let failed = false;

const report = (label, actual, budget) => {
  const ok = actual <= budget;
  failed ||= !ok;
  console.log(`${ok ? '✔' : '✘'} ${label}: ${fmt(actual)} (budget ${fmt(budget)})`);
};

// Worker bundle (from `wrangler deploy --dry-run --outdir dist`).
const workerDir = 'apps/api/dist';
if (!existsSync(workerDir)) throw new Error(`${workerDir} not found; run the build first`);
const workerBytes = readdirSync(workerDir)
  .filter((file) => file.endsWith('.js'))
  .reduce((sum, file) => sum + gzipSize(join(workerDir, file)), 0);
report('Worker script (gzip)', workerBytes, budgets.workerGzip);

// Landing page scripts referenced by the exported HTML.
const landingHtml = readFileSync('apps/web/out/es.html', 'utf8');
const scripts = [
  ...new Set([...landingHtml.matchAll(/src="(\/_next\/static\/[^"]+\.js)"/g)].map((m) => m[1])),
];
const landingBytes = scripts.reduce((sum, src) => sum + gzipSize(join('apps/web/out', src)), 0);
report(`Landing JS (gzip, ${scripts.length} files)`, landingBytes, budgets.landingJsGzip);

if (failed) process.exit(1);
