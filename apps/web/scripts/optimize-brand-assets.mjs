#!/usr/bin/env node
/**
 * Generates web-ready variants of the originals (run after replacing one):
 *   pnpm --filter @mundomotos/web optimize:assets
 * Originals stay in src/assets/<group>/ as the source of truth; outputs go to <group>/generated/.
 * Metadata (EXIF/GPS) is stripped from every output.
 */
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

import sharp from 'sharp';

const assets = new URL('../src/assets/', import.meta.url).pathname;

const brand = join(assets, 'brand/');
const services = join(assets, 'services/');

const jobs = [
  { src: 'logo-vector.png', name: 'logo', widths: [96, 192, 512], format: 'webp' },
  { src: 'logo-vector.png', name: 'icon', widths: [192], format: 'png' },
  // iOS renders transparent touch icons on an undefined background: flatten onto the brand black.
  {
    src: 'logo-vector.png',
    name: 'apple-icon',
    widths: [180],
    format: 'png',
    background: '#000000',
  },
  { src: 'fachada.jpg', name: 'fachada', widths: [640, 1280], format: 'webp' },
  // Service cards. The originals are ~512px wide, so that is the ceiling: 320 covers the narrow
  // end of the single-column phone layout, 512 the three-column desktop grid (1x, and the widest
  // a phone can use — soft on a dense screen, acceptable for decorative photography and the only
  // option until the client sends larger originals).
  ...['tune-up', 'brakes', 'tires', 'lighting', 'adjustments', 'valves'].map((name) => ({
    dir: services,
    src: `${name}.png`,
    name,
    widths: [320, 512],
    format: 'webp',
  })),
];

for (const { src, name, widths, format, background, dir = brand } of jobs) {
  const out = join(dir, 'generated');
  mkdirSync(out, { recursive: true });
  for (const width of widths) {
    const file = join(out, `${name}-${width}.${format}`);
    let image = sharp(join(dir, src)).resize({ width, withoutEnlargement: true });
    if (background) image = image.flatten({ background });
    await (
      format === 'webp'
        ? image.webp({ quality: 82 })
        : image.png({ palette: true, quality: 90, compressionLevel: 9 })
    ).toFile(file);
    console.log('✔', file.replace(assets, ''));
  }
}
