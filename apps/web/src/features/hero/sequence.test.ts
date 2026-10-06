import { describe, expect, it } from 'vitest';

import {
  assignShapes,
  choreoAt,
  IDLE_AMPLITUDE,
  idleOffset,
  introShift,
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
  sx: 40, // above the stage, off to the left
  sy: -220,
  hx: 900, // home in the logo
  hy: 300,
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
    choreoAt(c, frame * 16.67),
  );

describe('easing', () => {
  it('eases and clamps', () => {
    expect(smoothstep(0.5)).toBeCloseTo(0.5);
    expect([smoothstep(-1), smoothstep(2)]).toEqual([0, 1]);
  });
});

describe('choreoAt', () => {
  it.each([false, true])('starts above the stage and ends exactly home (flame: %s)', (flame) => {
    const c = particle({ flame });
    expect(choreoAt(c, 0)).toEqual({ x: c.sx, y: c.sy });
    // Still waiting its turn while the stagger runs.
    expect(choreoAt(c, c.delay)).toEqual({ x: c.sx, y: c.sy });
    const end = choreoAt(c, SEQUENCE_END);
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
      // No single frame moves far (a ~1000 px fall over 1.4 s peaks around 18 px/frame).
      expect(Math.max(...speeds)).toBeLessThan(30);
      // Speed changes gradually: no abrupt acceleration between consecutive frames.
      const accelerations = speeds.slice(1).map((v, i) => Math.abs(v - (speeds[i] ?? 0)));
      expect(Math.max(...accelerations)).toBeLessThan(2.5);
    },
  );

  it('staggers: a later particle is still on its way when an earlier one has landed', () => {
    const early = particle({ delay: 0 });
    const late = particle({ delay: TIMING.maxDelay });
    const t = TIMING.fall;
    expect(choreoAt(early, t).y).toBeCloseTo(early.hy, 5);
    expect(choreoAt(late, t).y).not.toBeCloseTo(late.hy, 0);
  });

  it('reveals the hero within the agreed window, and well under the 5 s auto-play budget', () => {
    const revealed = SEQUENCE_END + TIMING.settle;
    expect(revealed).toBeGreaterThanOrEqual(1800);
    expect(revealed).toBeLessThanOrEqual(2200);
    expect(revealed).toBeLessThan(5000);
  });
});

describe('introShift', () => {
  it('holds the figure at the intro spot until it is whole, then hands it to the layout', () => {
    expect(introShift(0)).toBe(1);
    expect(introShift(SEQUENCE_END)).toBe(1);
    expect(introShift(SEQUENCE_END + TIMING.settle)).toBe(0);
  });

  it('moves smoothly, with no jump at either end', () => {
    const step = 16.67;
    const samples = Array.from({ length: 200 }, (_, i) =>
      introShift(SEQUENCE_END - 200 + i * step),
    );
    const deltas = samples.slice(1).map((v, i) => Math.abs(v - (samples[i] ?? 0)));
    expect(Math.max(...deltas)).toBeLessThan(0.1);
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

describe('assignShapes', () => {
  it('mixes triangles and motorcycles about half and half', () => {
    const shapes = assignShapes(1000, 0.5, seeded());
    const motos = shapes.reduce((sum, shape) => sum + shape, 0);
    expect(motos).toBeGreaterThan(400);
    expect(motos).toBeLessThan(600);
  });
});
