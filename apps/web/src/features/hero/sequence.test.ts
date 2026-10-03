import { describe, expect, it } from 'vitest';

import { assignShapes, gradientSlot, pairStartPoints } from './sequence';

describe('gradientSlot', () => {
  it.each([
    [0, 0],
    [0.19, 0],
    [0.5, 2],
    [0.99, 4],
    [1, 4],
    [-1, 0],
  ])('maps %s to slot %s', (fraction, slot) => {
    expect(gradientSlot(fraction)).toBe(slot);
  });
});

describe('pairStartPoints', () => {
  it('sends red particles from the left of the wordmark and gold ones from the right', () => {
    const logoColors = Uint8Array.from([4, 0, 4, 0]); // gold, red, gold, red
    const wordmarkX = Float32Array.from([300, 10, 200, 20]); // unsorted
    const pairs = pairStartPoints(logoColors, wordmarkX);
    const startX = (particle: number) => wordmarkX[pairs[particle] ?? 0] ?? 0;
    expect(Math.max(startX(1), startX(3))).toBeLessThan(Math.min(startX(0), startX(2)));
  });
});

describe('assignShapes', () => {
  it('keeps every particle a triangle when the icon share is 0', () => {
    expect(assignShapes(50, 0).every((shape) => shape === 0)).toBe(true);
  });

  it('makes every particle an icon (motorcycle or helmet) when the share is 1', () => {
    const shapes = assignShapes(200, 1);
    expect(shapes.every((shape) => shape === 1 || shape === 2)).toBe(true);
    expect(shapes.includes(1) && shapes.includes(2)).toBe(true);
  });
});
