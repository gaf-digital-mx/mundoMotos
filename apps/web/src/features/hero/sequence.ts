/**
 * Pure helpers for the hero sequence (wordmark → motorcycle → spinning flame ring → wordmark).
 * Unit-tested; the island only wires them to the DOM and canvas.
 */

/**
 * Radius (in the targets' bbox-normalized 0–1 space) beyond which a target belongs to the flame
 * ring, not the motorcycle. The generator's 0.33 dark-part radius is in source-image space.
 */
const FLAME_RADIUS = 0.4;

/** Splits the logo targets (normalized 0–1) into the outer flame ring and the inner motorcycle. */
export const flameMask = (x: Float32Array, y: Float32Array): Uint8Array => {
  const mask = new Uint8Array(x.length);
  for (let i = 0; i < x.length; i++) {
    mask[i] = Math.hypot((x[i] ?? 0) - 0.5, (y[i] ?? 0) - 0.5) > FLAME_RADIUS ? 1 : 0;
  }
  return mask;
};

/** Ease-out cubic, 0–1. */
export const easeOutCubic = (t: number): number => 1 - (1 - Math.min(1, Math.max(0, t))) ** 3;

/** Ease-in-out cubic, 0–1. */
export const easeInOutCubic = (t: number): number => {
  const x = Math.min(1, Math.max(0, t));
  return x < 0.5 ? 4 * x ** 3 : 1 - (-2 * x + 2) ** 3 / 2;
};

/** Rotates (x, y) around (cx, cy) by `angle` radians. */
export const rotateAround = (x: number, y: number, cx: number, cy: number, angle: number) => {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return { x: cx + (x - cx) * cos - (y - cy) * sin, y: cy + (x - cx) * sin + (y - cy) * cos };
};

/**
 * Pairs wordmark points with logo particles so colors travel coherently: logo particles sorted by
 * color slot (red → gold → chrome) start from wordmark points sorted left → right (red → gold).
 */
export const pairStartPoints = (logoColors: Uint8Array, wordmarkX: Float32Array): Uint32Array => {
  const count = logoColors.length;
  const byColor = Array.from({ length: count }, (_, i) => i).sort(
    (a, b) => (logoColors[a] ?? 0) - (logoColors[b] ?? 0),
  );
  const byX = Array.from({ length: wordmarkX.length }, (_, i) => i).sort(
    (a, b) => (wordmarkX[a] ?? 0) - (wordmarkX[b] ?? 0),
  );
  const pairs = new Uint32Array(count);
  byColor.forEach((particle, rank) => {
    pairs[particle] = byX[Math.floor((rank / count) * byX.length)] ?? 0;
  });
  return pairs;
};

/** Particle shapes: 0 = outlined triangle, 1 = motorcycle icon. `motoShare` of them are icons. */
export const assignShapes = (
  count: number,
  motoShare: number,
  random: () => number = Math.random,
) => {
  const shapes = new Uint8Array(count);
  for (let i = 0; i < count; i++) shapes[i] = random() < motoShare ? 1 : 0;
  return shapes;
};

/** 24×24 filled motorcycle icon (even-odd), drawn once into sprites. */
export const MOTO_PATH =
  'M5 13a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm0 2.2a1.8 1.8 0 1 1 0 3.6 1.8 1.8 0 0 1 0-3.6ZM19 13a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm0 2.2a1.8 1.8 0 1 1 0 3.6 1.8 1.8 0 0 1 0-3.6ZM6.5 14l3-5h5.5l2-3h3.5l-1.2 2.2h-1.5l-1.6 2.6 3 3.8h-2.4l-1.9-2.6h-3.4l-2.2 3.6h-1.8Z';
