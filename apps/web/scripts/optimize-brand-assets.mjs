#!/usr/bin/env node
/**
 * Generates web-ready variants of the brand originals (run after replacing an original):
 *   pnpm --filter @mundomotos/web optimize:assets
 * Originals stay in src/assets/brand/ as the source of truth; outputs go to src/assets/brand/generated/.
 * Metadata (EXIF/GPS) is stripped from every output.
 */
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

import sharp from 'sharp';

const dir = new URL('../src/assets/brand/', import.meta.url).pathname;
const out = join(dir, 'generated');
mkdirSync(out, { recursive: true });

const jobs = [
  { src: 'logo-primario.png', name: 'logo', widths: [96, 192, 512], format: 'webp' },
  { src: 'logo-primario.png', name: 'icon', widths: [192], format: 'png' },
  { src: 'logo-primario.png', name: 'apple-icon', widths: [180], format: 'png' },
  { src: 'fachada.jpg', name: 'fachada', widths: [640, 1280], format: 'webp' },
];

for (const { src, name, widths, format } of jobs) {
  for (const width of widths) {
    const file = join(out, `${name}-${width}.${format}`);
    const image = sharp(join(dir, src)).resize({ width, withoutEnlargement: true });
    await (
      format === 'webp'
        ? image.webp({ quality: 82 })
        : image.png({ palette: true, quality: 90, compressionLevel: 9 })
    ).toFile(file);
    console.log('✔', file.replace(dir, ''));
  }
}
