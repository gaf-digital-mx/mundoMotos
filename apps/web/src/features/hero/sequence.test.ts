import { describe, expect, it } from 'vitest';

import {
  assignShapes,
  choreoAt,
  easeInOutCubic,
  easeOutCubic,
  IDLE_AMPLITUDE,
  idleOffset,
  pairStartPoints,
  rotateAround,
  SEQUENCE_END,
  smoothstep,
  TIMING,
  type Choreo,
} from './sequence';

const seeded = () => {
  let s = 7;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
};

const particle = (overrides: Partial<Choreo> = {}): Choreo => ({
  sx: 40, // on the wordmark (left)
  sy: 60,
  hx: 900, // home in the logo (right)
  hy: 300,
  ax: 780,
  ay: 260,
  rx: 24,
  ry: 18,
  w1: 0.0013,
  w2: 0.0011,
  p1: 0.4,
  p2: 1.9,
  delay: 120,
  flame: false,
  ...overrides,
});

/** Samples the whole sequence at 60 fps. */
const path = (c: Choreo) =>
  Array.from({ length: Math.ceil(SEQUENCE_END / 16.67) + 2 }, (_, frame) =>
    choreoAt(c, frame * 16.67, 880, 300),
  );

describe('easing', () => {
  it('eases and clamps', () => {
    expect([easeOutCubic(0), easeOutCubic(1), easeOutCubic(2)]).toEqual([0, 1, 1]);
    expect(easeInOutCubic(0.5)).toBeCloseTo(0.5);
    expect(smoothstep(0.5)).toBeCloseTo(0.5);
    expect([smoothstep(-1), smoothstep(2)]).toEqual([0, 1]);
  });

  it('rotates a point around a center', () => {
    const point = rotateAround(10, 0, 0, 0, Math.PI / 2);
    expect(point.x).toBeCloseTo(0);
    expect(point.y).toBeCloseTo(10);
  });
});

describe('choreoAt', () => {
  it.each([false, true])('starts on the wordmark and ends exactly home (flame: %s)', (flame) => {
    const c = particle({ flame });
    expect(choreoAt(c, 0, 880, 300)).toEqual({ x: c.sx, y: c.sy });
    const end = choreoAt(c, SEQUENCE_END, 880, 300);
    expect(end.x).toBeCloseTo(c.hx, 5);
    expect(end.y).toBeCloseTo(c.hy, 5);
  });

  it.each([false, true])(
    'moves smoothly: no jumps or sudden stops between frames (flame: %s)',
    (flame) => {
      const points = path(particle({ flame }));
      const speeds = points
        .slice(1)
        .map((p, i) => Math.hypot(p.x - (points[i]?.x ?? 0), p.y - (points[i]?.y ?? 0)));
      // No single frame moves far (a 860 px trip over ~0.8 s peaks around 25 px/frame).
      expect(Math.max(...speeds)).toBeLessThan(30);
      // Speed changes gradually: no abrupt acceleration between consecutive frames.
      const accelerations = speeds.slice(1).map((v, i) => Math.abs(v - (speeds[i] ?? 0)));
      expect(Math.max(...accelerations)).toBeLessThan(2.5);
    },
  );

  it('keeps the motorcycle home while the flame is still spinning in', () => {
    const t = TIMING.float + TIMING.moto + TIMING.maxDelay + 50;
    const bike = particle();
    const ring = particle({ flame: true });
    expect(choreoAt(bike, t, 880, 300).x).toBeCloseTo(bike.hx, 5);
    expect(choreoAt(ring, t, 880, 300).x).not.toBeCloseTo(ring.hx, 0);
  });

  it('fits the auto-play budget: hold + sequence + typing stays under 5 s (WCAG 2.2.2)', () => {
    expect(SEQUENCE_END).toBeLessThan(5000);
    expect(300 + SEQUENCE_END + 1100).toBeLessThan(5000);
  });
});

describe('idleOffset', () => {
  const c = particle();

  it('starts at exactly zero so the finished ring never jumps', () => {
    expect(idleOffset(c, 0)).toEqual({ x: 0, y: 0 });
  });

  it('stays small: softer than the floating orbit', () => {
    let max = 0;
    for (let t = 0; t < 20_000; t += 50) {
      const { x, y } = idleOffset(c, t);
      max = Math.max(max, Math.abs(x), Math.abs(y));
    }
    expect(max).toBeGreaterThan(0);
    expect(max).toBeLessThanOrEqual(2 * Math.max(c.rx, c.ry) * IDLE_AMPLITUDE + 1e-9);
  });

  it('moves continuously frame to frame', () => {
    let previous = idleOffset(c, 0);
    for (let t = 33; t < 10_000; t += 33) {
      const next = idleOffset(c, t);
      expect(Math.hypot(next.x - previous.x, next.y - previous.y)).toBeLessThan(1);
      previous = next;
    }
  });
});

describe('pairStartPoints', () => {
  it('sends red particles from the left of the wordmark and gold ones from the right', () => {
    const logoColors = Uint8Array.from([4, 0, 4, 0]);
    const wordmarkX = Float32Array.from([300, 10, 200, 20]);
    const pairs = pairStartPoints(logoColors, wordmarkX);
    const startX = (index: number) => wordmarkX[pairs[index] ?? 0] ?? 0;
    expect(Math.max(startX(1), startX(3))).toBeLessThan(Math.min(startX(0), startX(2)));
  });
});

describe('assignShapes', () => {
  it('mixes triangles and motorcycles about half and half', () => {
    const shapes = assignShapes(1000, 0.5, seeded());
    const motos = shapes.reduce((sum, shape) => sum + shape, 0);
    expect(motos).toBeGreaterThan(400);
    expect(motos).toBeLessThan(600);
  });
});
