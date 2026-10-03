#!/usr/bin/env node
/**
 * Samples the brand logo into particle targets for the interactive hero (run after
 * replacing the logo): `pnpm --filter @mundomotos/web generate:particles`.
 *
 * - Shape = warm body/flames and bright chrome; plus solid black parts (tires, seat) only where
 *   the figure encloses them, so the black background never counts.
 * - Each particle is flagged as flame ring or motorcycle (outer warm band = ring), so the hero
 *   can assemble the bike first and spin the ring in afterwards.
 *
 * Output: src/features/hero/particles-data.ts, base64 [x, y, info] byte triples. x/y are
 * normalized to 0–255 inside the bounding box; info = color slot (bits 0–6) | flame flag (bit 7).
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

const SOURCE = fileURLToPath(new URL('../src/assets/brand/logo-vector.png', import.meta.url));
const OUTPUT = fileURLToPath(new URL('../src/features/hero/particles-data.ts', import.meta.url));
/** Desktop particle count; the hero thins it for small devices (keep in sync with hero-stage). */
const TARGET_POINTS = 1600;
const SIZE = 220; // sampling resolution (longest side): coarse enough for a regular stride
/** Cap for graphite (outline/tire) particles so the figure keeps its flame colors. */
const DARK_SHARE = 0.12;

/** Color slots (index = slot used by the canvas). */
const FLAME = [
  [240, 21, 19], // 0 flame-red
  [253, 70, 22], // 1 flame-orange
  [238, 117, 28], // 2 ember
  [253, 162, 17], // 3 amber
  [251, 195, 21], // 4 ignition-gold
];
const SILVER = 5; // silver-mist: chrome, rims, windshield highlights
const GRAPHITE = 6; // graphite: solid black parts

const { data, info } = await sharp(SOURCE)
  .resize(SIZE, SIZE, { fit: 'inside' })
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
const { width, height } = info;
const opaque = new Uint8Array(width * height);
for (let i = 0; i < width * height; i++) opaque[i] = data[i * 4 + 3] >= 128 ? 1 : 0;
// The logo sits on black, so "dark" pixels are only part of the figure when the figure
// surrounds them (see isEnclosed): that keeps the background out.

// Ring vs motorcycle: the ring touches the bike (front tire, handlebar), so connectivity can't
// separate them. Rule: a pixel belongs to the flame ring when it lies in the outer band of the
// circle around the logo center AND is a warm flame color (the ring is never chrome or black).
// Measured against the figure's bounding box (computed below, once the shape pixels are known).
const RING_INNER = 0.4; // radius as a fraction of the bounding-box span
let cx = width / 2;
let cy = height / 2;
let ringSpan = Math.max(width, height);
const isRingBand = (x, y) => Math.hypot(x - cx, y - cy) / ringSpan >= RING_INNER;

/**
 * Shape pixels: warm body/flames and bright chrome (as the original look: crisp, high contrast).
 * Dark pixels count only as part of a *solid* black area (tires, seat, engine), never thin
 * outlines or shading, so the figure stays defined.
 */
const classify = (r, g, b) => {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const value = max / 255;
  const saturation = max === 0 ? 0 : (max - min) / max;
  if (value < 0.28) return GRAPHITE;
  if (saturation < 0.35 && value < 0.55) return null; // mid-gray shading: skip
  if (saturation < 0.3 || (b > r && b > g)) return SILVER; // bright chrome / glass
  let best = 0;
  let bestDistance = Infinity;
  FLAME.forEach(([pr, pg, pb], index) => {
    const distance = (r - pr) ** 2 + (g - pg) ** 2 + (b - pb) ** 2;
    if (distance < bestDistance) [best, bestDistance] = [index, distance];
  });
  return best;
};

const slots = new Int8Array(width * height).fill(-1);
for (let p = 0; p < width * height; p++) {
  if (!opaque[p]) continue;
  const slot = classify(data[p * 4], data[p * 4 + 1], data[p * 4 + 2]);
  if (slot !== null) slots[p] = slot;
}
{
  let [minX, maxX, minY, maxY] = [width, 0, height, 0];
  for (let p = 0; p < width * height; p++) {
    const slot = slots[p];
    if (slot === -1 || slot === GRAPHITE) continue;
    const x = p % width;
    const y = (p - x) / width;
    [minX, maxX, minY, maxY] = [
      Math.min(minX, x),
      Math.max(maxX, x),
      Math.min(minY, y),
      Math.max(maxY, y),
    ];
  }
  cx = (minX + maxX) / 2;
  cy = (minY + maxY) / 2;
  ringSpan = Math.max(maxX - minX, maxY - minY) || 1;
}

/** True when shape pixels exist within `reach` px on at least 3 of the 4 sides. */
const isEnclosed = (x, y, reach = 10) => {
  let sides = 0;
  for (const [dx, dy] of [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ]) {
    for (let step = 1; step <= reach; step++) {
      const nx = x + dx * step;
      const ny = y + dy * step;
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) break;
      const slot = slots[ny * width + nx];
      if (slot !== -1 && slot !== GRAPHITE) {
        sides++;
        break;
      }
    }
  }
  return sides >= 3;
};
/** A dark pixel is "solid" when most of its 7×7 neighbourhood is dark and opaque too. */
const SOLID_RADIUS = 3;
const SOLID_MIN = 0.85;
const isSolidDark = (x, y) => {
  let dark = 0;
  let total = 0;
  for (let dy = -SOLID_RADIUS; dy <= SOLID_RADIUS; dy++) {
    for (let dx = -SOLID_RADIUS; dx <= SOLID_RADIUS; dx++) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
      total++;
      if (slots[ny * width + nx] === GRAPHITE) dark++;
    }
  }
  return dark / total >= SOLID_MIN;
};

const colored = [];
const dark = [];
for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    const slot = slots[y * width + x];
    if (slot === -1) continue;
    if (slot === GRAPHITE) {
      const insideRing = Math.hypot(x - cx, y - cy) / ringSpan < RING_INNER;
      if (insideRing && isSolidDark(x, y) && isEnclosed(x, y)) dark.push([x, y, GRAPHITE]);
      continue;
    }
    const flame = slot <= 4 && isRingBand(x, y);
    colored.push([x, y, slot | (flame ? 0x80 : 0)]);
  }
}

/** Deterministic stride sampling in scan order: an even, regular coverage that reads crisp. */
const sample = (list, target) => {
  const stride = Math.max(1, list.length / target);
  const out = [];
  for (let i = 0; i < list.length && out.length < target; i += stride)
    out.push(list[Math.floor(i)]);
  return out;
};
const darkTarget = Math.min(dark.length, Math.round(TARGET_POINTS * DARK_SHARE));
const picked = [...sample(colored, TARGET_POINTS - darkTarget), ...sample(dark, darkTarget)];
if (picked.length === 0) throw new Error('No particles sampled: check the logo source.');

const xs = picked.map(([x]) => x);
const ys = picked.map(([, y]) => y);
const [minX, maxX, minY, maxY] = [
  Math.min(...xs),
  Math.max(...xs),
  Math.min(...ys),
  Math.max(...ys),
];
const span = Math.max(maxX - minX, maxY - minY) || 1;
const bytes = Buffer.alloc(picked.length * 3);
picked.forEach(([x, y, infoByte], i) => {
  bytes[i * 3] = Math.round(((x - minX) / span) * 255);
  bytes[i * 3 + 1] = Math.round(((y - minY) / span) * 255);
  bytes[i * 3 + 2] = infoByte;
});

writeFileSync(
  OUTPUT,
  `// Generated by scripts/generate-hero-particles.mjs — do not edit by hand.\n` +
    `/** ${picked.length} particles as base64 [x, y, info] byte triples (x/y: 0–255; info: color slot | flame bit 0x80). */\n` +
    `export const PARTICLES_B64 =\n  '${bytes.toString('base64')}';\n`,
);
const flameCount = picked.filter(([, , infoByte]) => infoByte & 0x80).length;
console.log(
  `✔ ${picked.length} particles (${flameCount} flame, ${darkTarget} graphite of ${dark.length} solid-dark px) from ${colored.length} shape px`,
);
