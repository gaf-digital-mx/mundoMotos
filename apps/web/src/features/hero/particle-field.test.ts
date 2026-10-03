import { describe, expect, it } from 'vitest';

import { createField, decodeTargets, settle, stepField, type Targets } from './particle-field';
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

  it('settle snaps everything home with no motion (reduced motion)', () => {
    const field = createField(targets, box, seeded());
    settle(field);
    expect(stepField(field, null)).toBe(0);
  });
});
