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
const featured = join(assets, 'featured/');
const backgrounds = join(assets, 'backgrounds/');

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
  // Featured categories. One photo per category card: 480 covers a phone and the two-column
  // grid, 960 the card that spans both columns on a wide screen.
  ...['lighting', 'accessories', 'protection', 'tires', 'tubes', 'rims', 'brake-pads'].map(
    (name) => ({ dir: featured, src: `${name}.jpg`, name, widths: [480, 960], format: 'webp' }),
  ),
  // Section backgrounds. These run the full width of the screen rather than the page container,
  // so the widths follow the viewport: 768 a phone, 1280 a tablet or a narrow window, 1887 the
  // original's own width — the ceiling, since nothing is gained by enlarging it. They sit under
  // a veil, which is why they are the one group worth compressing harder than the rest.
  {
    dir: backgrounds,
    src: 'final-cta.png',
    name: 'final-cta',
    widths: [768, 1280, 1887],
    format: 'webp',
    quality: 70,
  },
  // The phone gets its own portrait cut of the same scene: the wide one holds a 3.8:1 frame, and
  // a phone can only ever show a sliver of that. 940 is the original's width and the ceiling.
  {
    dir: backgrounds,
    src: 'final-cta-mobile.png',
    name: 'final-cta-mobile',
    widths: [480, 768, 940],
    format: 'webp',
    quality: 70,
  },
];

for (const { src, name, widths, format, background, quality = 82, dir = brand } of jobs) {
  const out = join(dir, 'generated');
  mkdirSync(out, { recursive: true });
  for (const width of widths) {
    const file = join(out, `${name}-${width}.${format}`);
    let image = sharp(join(dir, src)).resize({ width, withoutEnlargement: true });
    if (background) image = image.flatten({ background });
    await (
      format === 'webp'
        ? image.webp({ quality })
        : image.png({ palette: true, quality: 90, compressionLevel: 9 })
    ).toFile(file);
    console.log('✔', file.replace(assets, ''));
  }
}
