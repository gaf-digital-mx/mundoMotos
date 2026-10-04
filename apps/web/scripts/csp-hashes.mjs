/**
 * Post-build step: hashes every inline executable script of the static export and writes
 * `out/_csp-hashes.json` ({ "/es": ["sha256-…"], … }, keyed by HTML path without `.html`).
 * The Worker reads it to send a hash-based Content-Security-Policy per page: a static export has
 * no per-request nonce, and Next.js inlines the RSC payload as scripts that change every build.
 */
import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';

import { Window } from 'happy-dom';

const OUT = new URL('../out/', import.meta.url).pathname;
const EXECUTABLE_TYPE = /^(|text\/javascript|application\/javascript|module)$/i;

const htmlFiles = async (dir) => {
  const entries = await readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) => {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) return entry.name === '_next' ? [] : htmlFiles(path);
      return entry.name.endsWith('.html') ? [path] : [];
    }),
  );
  return nested.flat();
};

// A real HTML parser, not a regex: script boundaries follow the HTML spec (`</script >`, comments,
// attribute values containing `>`). Parsing only: no script runs, nothing is fetched.
const window = new Window({
  settings: {
    disableJavaScriptEvaluation: true,
    disableJavaScriptFileLoading: true,
    disableCSSFileLoading: true,
  },
});
const parser = new window.DOMParser();

const inlineScriptHashes = (html) => {
  const hashes = new Set();
  for (const script of parser.parseFromString(html, 'text/html').querySelectorAll('script')) {
    const body = script.textContent ?? '';
    if (script.hasAttribute('src') || body.length === 0) continue;
    // Data blocks (JSON-LD) never execute, so CSP doesn't apply to them.
    if (!EXECUTABLE_TYPE.test(script.getAttribute('type') ?? '')) continue;
    // Browsers hash the script text after the HTML parser normalizes newlines and NULs.
    const source = body.replace(/\r\n?/g, '\n').replaceAll('\0', '\uFFFD');
    hashes.add(`sha256-${createHash('sha256').update(source, 'utf8').digest('base64')}`);
  }
  return [...hashes].sort();
};

const manifest = {};
for (const file of (await htmlFiles(OUT)).sort()) {
  const key = `/${relative(OUT, file)
    .split(sep)
    .join('/')
    .replace(/\.html$/, '')}`;
  manifest[key] = inlineScriptHashes(await readFile(file, 'utf8'));
}
// Fail the build instead of shipping a policy that would block the site once enforced: every
// Next.js page inlines its RSC bootstrap, and the Worker serves /404 for missing pages.
const empty = Object.entries(manifest).filter(([, hashes]) => hashes.length === 0);
if (!manifest['/404'] || empty.length > 0) {
  throw new Error(
    `CSP manifest incomplete: ${manifest['/404'] ? '' : 'missing /404; '}pages without inline scripts: ${empty.map(([key]) => key).join(', ') || 'none'}`,
  );
}
await writeFile(join(OUT, '_csp-hashes.json'), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`CSP: hashed inline scripts of ${Object.keys(manifest).length} pages`);
await window.happyDOM.close();
