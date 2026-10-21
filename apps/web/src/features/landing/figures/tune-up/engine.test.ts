import { describe, expect, it } from 'vitest';

import { IDLE_RPM, MAX_RPM, readoutOf, rpmAt, shown, sparksPerSecond, sweepAt } from './engine';

describe('the tune-up bench', () => {
  it('idles with the throttle shut and reaches the top of the scale wide open', () => {
    expect(rpmAt(0)).toBe(IDLE_RPM);
    expect(rpmAt(1)).toBe(MAX_RPM);
    expect(rpmAt(2)).toBe(MAX_RPM);
    expect(rpmAt(-1)).toBe(IDLE_RPM);
  });

  it('sparks once every two turns, as a four-stroke does', () => {
    // 1,400 rpm is 700 sparks a minute.
    expect(sparksPerSecond(1400)).toBeCloseTo(700 / 60);
    expect(sparksPerSecond(8000)).toBeCloseTo(4000 / 60);
  });

  it('puts the needle where the speed is on the scale', () => {
    expect(sweepAt(0)).toBe(0);
    expect(sweepAt(MAX_RPM / 2)).toBeCloseTo(0.5);
    expect(sweepAt(MAX_RPM * 2)).toBe(1);
  });

  it('reads out a number a person would say, in the page’s own locale', () => {
    expect(shown(1427)).toBe(1450);
    expect(readoutOf(1427, '{rpm} rpm', 'es-MX')).toBe('1,450 rpm');
    // The unit may sit on either side of the number.
    expect(readoutOf(1427, 'rpm {rpm}', 'es-MX')).toBe('rpm 1,450');
  });
});
