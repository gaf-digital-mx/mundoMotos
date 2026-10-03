/**
 * Pure, time-parameterized choreography for the hero (wordmark → floating → motorcycle →
 * spinning flame ring). Every phase blends smoothly into the next (smoothstep / ease-in-out
 * weights have zero slope at both ends), so particles never stop or jump between phases.
 */

const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

/** Ease-out cubic, 0–1. */
export const easeOutCubic = (t: number): number => 1 - (1 - clamp01(t)) ** 3;

/** Ease-in-out cubic, 0–1. */
export const easeInOutCubic = (t: number): number => {
  const x = clamp01(t);
  return x < 0.5 ? 4 * x ** 3 : 1 - (-2 * x + 2) ** 3 / 2;
};

/** Smoothstep, 0–1 (zero slope at both ends). */
export const smoothstep = (t: number): number => {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
};

/** Rotates (x, y) around (cx, cy) by `angle` radians. */
export const rotateAround = (x: number, y: number, cx: number, cy: number, angle: number) => {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return { x: cx + (x - cx) * cos - (y - cy) * sin, y: cy + (x - cx) * sin + (y - cy) * cos };
};

/** Timeline after the hold (ms). */
export const TIMING = {
  release: 800, // text → floating orbit blend
  float: 1200, // everything floats (release overlaps the start of this window)
  moto: 1000, // motorcycle glides home; the flame keeps floating
  spin: 600, // flame ring spins into place
  maxDelay: 250, // per-particle stagger
} as const;
export const SEQUENCE_END = TIMING.float + TIMING.moto + TIMING.spin + TIMING.maxDelay;
const SPIN_ANGLE = Math.PI * 0.9;

/** Everything needed to place one particle at any time `t` of the sequence. */
export type Choreo = {
  sx: number; // start: a point of the wordmark
  sy: number;
  hx: number; // home: its place in the logo
  hy: number;
  ax: number; // floating orbit: anchor, radii, angular speeds (rad/ms), phases
  ay: number;
  rx: number;
  ry: number;
  w1: number;
  w2: number;
  p1: number;
  p2: number;
  delay: number; // stagger 0–maxDelay
  flame: boolean;
};

/** Position at `t` ms after the wordmark disintegrates. Pure and continuous in `t`. */
export const choreoAt = (c: Choreo, t: number, cx: number, cy: number) => {
  const orbitX = c.ax + Math.cos(c.w1 * t + c.p1) * c.rx;
  const orbitY = c.ay + Math.sin(c.w2 * t + c.p2) * c.ry;
  const release = smoothstep((t - c.delay) / TIMING.release);
  let x = c.sx + (orbitX - c.sx) * release;
  let y = c.sy + (orbitY - c.sy) * release;

  let homeX = c.hx;
  let homeY = c.hy;
  let weight: number;
  if (c.flame) {
    const progress = (t - TIMING.float - TIMING.moto - c.delay) / TIMING.spin;
    const point = rotateAround(c.hx, c.hy, cx, cy, SPIN_ANGLE * (1 - easeOutCubic(progress)));
    homeX = point.x;
    homeY = point.y;
    weight = easeInOutCubic(progress);
  } else {
    weight = easeInOutCubic((t - TIMING.float - c.delay) / TIMING.moto);
  }
  x += (homeX - x) * weight;
  y += (homeY - y) * weight;
  return { x, y };
};

/**
 * Pairs wordmark points with logo particles so colors travel coherently: logo particles sorted by
 * color slot (red → gold → chrome → graphite) start from wordmark points sorted left → right.
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
