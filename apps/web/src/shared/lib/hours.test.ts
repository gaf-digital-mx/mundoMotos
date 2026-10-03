import { describe, expect, it } from 'vitest';

import { formatTime } from './hours';

describe('formatTime', () => {
  it.each([
    ['09:00', /^9:00\s?a\.?\s?m\.?$/],
    ['18:30', /^6:30\s?p\.?\s?m\.?$/],
    ['19:00', /^7:00\s?p\.?\s?m\.?$/],
  ])('formats %s in 12h es-MX', (time, expected) => {
    expect(formatTime(time).replace(/[\u00a0\u202f]/g, ' ')).toMatch(expected);
  });
});
