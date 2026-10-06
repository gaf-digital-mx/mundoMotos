/**
 * Pure, time-parameterized choreography for the hero: particles fall from above the stage,
 * spread across its width, and settle into the logo. Smoothstep weights have zero slope at both
 * ends, so nothing starts or stops abruptly; `introShift` then carries the finished figure from
 * where it formed (centred under the wordmark) to its place in the layout.
 */

const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

/** Smoothstep, 0–1 (zero slope at both ends). */
export const smoothstep = (t: number): number => {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
};

/** Timeline from the first particle (ms). */
export const TIMING = {
  fall: 1400, // one particle's trip from above the stage to its place in the logo
  maxDelay: 400, // per-particle stagger, so the figure fills in rather than snapping
  settle: 400, // the formed figure (and the wordmark) glide into the layout
} as const;
/** The figure is complete here; the rest of the hero is revealed from this moment. */
export const SEQUENCE_END = TIMING.fall + TIMING.maxDelay;

/** Everything needed to place one particle at any time `t` of the sequence. */
export type Choreo = {
  sx: number; // start: somewhere above the stage, anywhere across its width
  sy: number;
  hx: number; // home: its place in the logo
  hy: number;
  rx: number; // idle drift once the figure is formed: radii, angular speeds (rad/ms), phases
  ry: number;
  w1: number;
  w2: number;
  p1: number;
  p2: number;
  delay: number; // stagger 0–maxDelay
  flame: boolean;
};

/** Random orbit parameters, shared by the floating phase and the idle drift. */
export const randomOrbit = (): Pick<Choreo, 'rx' | 'ry' | 'w1' | 'w2' | 'p1' | 'p2'> => ({
  rx: 8 + Math.random() * 22,
  ry: 6 + Math.random() * 18,
  w1: 0.0008 + Math.random() * 0.001,
  w2: 0.0007 + Math.random() * 0.001,
  p1: Math.random() * Math.PI * 2,
  p2: Math.random() * Math.PI * 2,
});

/**
 * Position at `t` ms after the first particle starts falling. Pure and continuous in `t`: the
 * smoothstep gives zero velocity at both ends, so a particle eases out of the sky and comes to
 * rest without a jolt.
 */
export const choreoAt = (c: Choreo, t: number) => {
  const fall = smoothstep((t - c.delay) / TIMING.fall);
  return { x: c.sx + (c.hx - c.sx) * fall, y: c.sy + (c.hy - c.sy) * fall };
};

/**
 * How much of the intro offset still applies at `t`: the whole of it while the figure forms,
 * then eased to nothing as the layout takes over. Multiply the stage's intro vector by this.
 */
export const introShift = (t: number): number => 1 - smoothstep((t - SEQUENCE_END) / TIMING.settle);

/** Fraction of the floating orbit kept while the finished flame ring idles (softer motion). */
export const IDLE_AMPLITUDE = 0.35;
/** The idle drift fades in over this long so the ring never jumps when the sequence ends. */
const IDLE_FADE_IN_MS = 900;
/** The idle loop runs at ~30 fps: imperceptible for slow drift, half the CPU/battery. */
export const IDLE_FRAME_MS = 1000 / 30;

/**
 * Idle drift of a flame particle around its home, `t` ms after the ring formed: the same kind
 * of orbit as while floating, smaller and slower, faded in smoothly.
 */
export const idleOffset = (c: Pick<Choreo, 'rx' | 'ry' | 'w1' | 'w2' | 'p1' | 'p2'>, t: number) => {
  const fade = smoothstep(t / IDLE_FADE_IN_MS) * IDLE_AMPLITUDE;
  // Subtract the t = 0 term so the offset starts at exactly 0.
  return {
    x: (Math.cos(c.w1 * 0.6 * t + c.p1) - Math.cos(c.p1)) * c.rx * fade,
    y: (Math.sin(c.w2 * 0.6 * t + c.p2) - Math.sin(c.p2)) * c.ry * fade,
  };
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
