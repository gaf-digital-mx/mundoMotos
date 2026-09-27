import { describe, expect, it } from 'vitest';

import { fixedClock, systemClock } from './clock';

describe('systemClock', () => {
  it('returns the current time', () => {
    const before = Date.now();
    const now = systemClock.now().getTime();
    expect(now).toBeGreaterThanOrEqual(before);
    expect(now).toBeLessThanOrEqual(Date.now());
  });
});

describe('fixedClock', () => {
  it('always returns the same instant as a fresh Date', () => {
    const at = new Date('2026-09-26T12:00:00Z');
    const clock = fixedClock(at);
    const first = clock.now();
    first.setFullYear(2000);
    expect(clock.now()).toEqual(at);
  });
});
