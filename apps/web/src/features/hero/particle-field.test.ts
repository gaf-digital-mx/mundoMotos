import { describe, expect, it } from 'vitest';

import {
  createField,
  createFieldAt,
  decodeTargets,
  settle,
  stepField,
  type Targets,
} from './particle-field';
import { PARTICLES_B64 } from './particles-data';

const box = { width: 400, height: 400 };
const targets: Targets = {
  x: Float32Array.from([0, 1]),
  y: Float32Array.from([0, 1]),
  color: Uint8Array.from([0, 4]),
  count: 2,
};
const seeded = () => {
  let s = 1;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
};

describe('decodeTargets', () => {
  it('decodes the generated logo data into normalized points with flame color slots', () => {
    const decoded = decodeTargets(PARTICLES_B64);
    expect(decoded.count).toBeGreaterThan(500);
    expect(Math.max(...decoded.x)).toBeLessThanOrEqual(1);
    expect(Math.min(...decoded.y)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...decoded.color)).toBeLessThanOrEqual(5);
  });

  it('thins evenly to the requested limit (fewer particles on small devices)', () => {
    expect(decodeTargets(PARTICLES_B64, 300).count).toBe(300);
  });
});

describe('particle physics', () => {
  it('lays homes inside the box, centered with a margin', () => {
    const field = createField(targets, box, seeded());
    expect(field.hx[0]).toBeCloseTo(16);
    expect(field.hx[1]).toBeCloseTo(384);
  });

  it('offsets homes by the box position inside a larger canvas', () => {
    const field = createField(targets, { ...box, x: 100, y: 50 }, seeded());
    expect(field.hx[0]).toBeCloseTo(116);
    expect(field.hy[0]).toBeCloseTo(66);
  });

  it('flies from explicit start points to explicit homes (text → logo)', () => {
    const field = createFieldAt(
      { x: Float32Array.from([10, 20]), y: Float32Array.from([10, 20]) },
      { x: Float32Array.from([300, 350]), y: Float32Array.from([300, 350]) },
      Uint8Array.from([0, 4]),
      3,
      seeded(),
    );
    expect(field.px[0]).toBe(10);
    expect(Math.hypot(field.vx[0] ?? 0, field.vy[0] ?? 0)).toBeGreaterThan(0);
    for (let frame = 0; frame < 400; frame++) stepField(field, null);
    expect(field.px[1]).toBeCloseTo(350, 0);
  });

  it('assembles toward the silhouette and comes to rest', () => {
    const field = createField(targets, box, seeded());
    let energy = Infinity;
    for (let frame = 0; frame < 400; frame++) energy = stepField(field, null);
    expect(energy).toBeLessThan(0.001);
    expect(field.px[0]).toBeCloseTo(field.hx[0] ?? 0, 0);
    expect(field.py[1]).toBeCloseTo(field.hy[1] ?? 0, 0);
  });

  it('pushes particles away from the pointer', () => {
    const field = createField(targets, box, seeded());
    settle(field);
    const before = field.px[0] ?? 0;
    stepField(field, { x: before + 10, y: field.py[0] ?? 0 });
    expect(field.px[0]).toBeLessThan(before);
  });

  it('falls asleep with the full logo data (energy under the 0.01 sleep threshold)', () => {
    const field = createField(decodeTargets(PARTICLES_B64), box, seeded());
    let energy = Infinity;
    for (let frame = 0; frame < 600 && energy >= 0.01; frame++) energy = stepField(field, null);
    expect(energy).toBeLessThan(0.01);
  });

  it('is time-based: two half-steps travel about as far as one full step', () => {
    const a = createField(targets, box, seeded());
    const b = createField(targets, box, seeded());
    stepField(a, null, 1);
    stepField(b, null, 0.5);
    stepField(b, null, 0.5);
    expect(Math.abs((a.px[0] ?? 0) - (b.px[0] ?? 0))).toBeLessThan(2);
  });

  it('settle snaps everything home with no motion (reduced motion)', () => {
    const field = createField(targets, box, seeded());
    settle(field);
    expect(stepField(field, null)).toBe(0);
  });
});
