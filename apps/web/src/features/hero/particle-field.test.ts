import { describe, expect, it } from 'vitest';

import {
  createField,
  decodeTargets,
  settle,
  snapToHome,
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
  it('decodes the generated logo data into normalized points with palette color slots', () => {
    const decoded = decodeTargets(PARTICLES_B64);
    expect(decoded.count).toBeGreaterThan(500);
    expect(Math.max(...decoded.x)).toBeLessThanOrEqual(1);
    expect(Math.min(...decoded.y)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...decoded.color)).toBeLessThanOrEqual(6); // 0–4 flame, 5 chrome, 6 graphite
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

  it('floats gently with a weak spring (slower than the assembly spring)', () => {
    const fast = createField(targets, box, seeded());
    const slow = createField(targets, box, seeded());
    stepField(fast, null);
    stepField(slow, null, 1, 0.006, 0.94);
    const moved = (field: typeof fast) => Math.hypot(field.vx[0] ?? 0, field.vy[0] ?? 0);
    expect(moved(slow)).toBeLessThan(moved(fast));
  });

  it('snapToHome pins only the selected particles (motorcycle before the flame spin)', () => {
    const field = createField(targets, box, seeded());
    field.hx[0] = 999; // stale float target
    snapToHome(field, Float32Array.from([10, 20]), Float32Array.from([30, 40]), (i) => i === 0);
    expect([field.px[0], field.py[0], field.hx[0], field.vx[0]]).toEqual([10, 30, 10, 0]);
    expect(field.hx[1]).not.toBe(20);
  });

  it('settle snaps everything home with no motion (reduced motion)', () => {
    const field = createField(targets, box, seeded());
    settle(field);
    expect(stepField(field, null)).toBe(0);
  });
});
