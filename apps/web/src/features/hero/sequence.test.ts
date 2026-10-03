import { describe, expect, it } from 'vitest';

import { decodeTargets } from './particle-field';
import { PARTICLES_B64 } from './particles-data';
import {
  assignShapes,
  easeInOutCubic,
  easeOutCubic,
  flameMask,
  gradientSlot,
  pairStartPoints,
  rotateAround,
} from './sequence';

const seeded = () => {
  let s = 7;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
};

describe('gradientSlot', () => {
  it.each([
    [0, 0],
    [0.5, 2],
    [1, 4],
    [-1, 0],
  ])('maps %s to slot %s', (fraction, slot) => {
    expect(gradientSlot(fraction)).toBe(slot);
  });
});

describe('flameMask', () => {
  it('separates the outer ring from the motorcycle', () => {
    const mask = flameMask(
      Float32Array.from([0.5, 0.95, 0.05]),
      Float32Array.from([0.5, 0.5, 0.5]),
    );
    expect([...mask]).toEqual([0, 1, 1]);
  });

  it('finds both parts in the real logo data', () => {
    const { x, y } = decodeTargets(PARTICLES_B64);
    const flame = flameMask(x, y).reduce((sum, value) => sum + value, 0);
    expect(flame).toBeGreaterThan(x.length * 0.2);
    expect(flame).toBeLessThan(x.length * 0.8);
  });
});

describe('easeOutCubic / rotateAround', () => {
  it('eases from 0 to 1 and clamps', () => {
    expect(easeOutCubic(0)).toBe(0);
    expect(easeOutCubic(1)).toBe(1);
    expect(easeOutCubic(2)).toBe(1);
    expect(easeOutCubic(0.5)).toBeGreaterThan(0.5);
  });

  it('eases in and out symmetrically', () => {
    expect(easeInOutCubic(0)).toBe(0);
    expect(easeInOutCubic(0.5)).toBeCloseTo(0.5);
    expect(easeInOutCubic(1)).toBe(1);
    expect(easeInOutCubic(0.25)).toBeLessThan(0.25);
  });

  it('rotates a point around a center', () => {
    const point = rotateAround(10, 0, 0, 0, Math.PI / 2);
    expect(point.x).toBeCloseTo(0);
    expect(point.y).toBeCloseTo(10);
  });
});

describe('pairStartPoints', () => {
  it('sends red particles from the left of the wordmark and gold ones from the right', () => {
    const logoColors = Uint8Array.from([4, 0, 4, 0]);
    const wordmarkX = Float32Array.from([300, 10, 200, 20]);
    const pairs = pairStartPoints(logoColors, wordmarkX);
    const startX = (particle: number) => wordmarkX[pairs[particle] ?? 0] ?? 0;
    expect(Math.max(startX(1), startX(3))).toBeLessThan(Math.min(startX(0), startX(2)));
  });
});

describe('assignShapes', () => {
  it('mixes triangles and motorcycles about half and half', () => {
    const shapes = assignShapes(1000, 0.5, seeded());
    const motos = shapes.reduce((sum, shape) => sum + shape, 0);
    expect(motos).toBeGreaterThan(400);
    expect(motos).toBeLessThan(600);
    expect(shapes.every((shape) => shape === 0 || shape === 1)).toBe(true);
  });
});
